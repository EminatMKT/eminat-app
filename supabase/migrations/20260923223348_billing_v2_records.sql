-- Billing v2: one business table for payments, events and month notes.
--
-- Approved design: docs/superpowers/specs/2026-09-23-billing-v2-approved-contract.md
-- Review record:   docs/superpowers/specs/2026-09-23-billing-v2-database-proposal.md
--
-- Scope of this migration: one table, three indexes, one trigger function, two triggers,
-- the grants and four RLS policies. It creates NO category/status catalog, NO supplier
-- master, NO notification queue, NO currency catalog and NO audit table, and it does not
-- touch `cobranzas_ventas`, `cobranzas_cuentas` or `cobranzas_depositos` — legacy v1 keeps
-- its tables, its data and its grants.

-- ---------------------------------------------------------------------------
-- 0. Module slug baseline.
--
-- `role_modules.module_slug` is plain text with no FK behind it, and `has_module()` opens
-- with `is_admin() OR ...`: a misspelled slug returns true for the admin — the person who
-- writes and tests this migration — and false for everyone else, silently. The slug is
-- declared once here and the migration aborts if no role actually carries it.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  module_slug_constant constant text := 'cobranzas';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.role_modules
    WHERE module_slug = module_slug_constant
  ) THEN
    RAISE EXCEPTION 'Missing module grant baseline: %', module_slug_constant;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1. The table.
--
-- `amount` is the only column that separates *unknown* from *explicitly zero*, which is why
-- it stays nullable: a blank amount saved as 0 turns a missing figure into a confirmed
-- obligation of nothing. `numeric` is deliberately unscaled — `numeric(14,2)` coerces the
-- scale BEFORE the CHECK runs, so -0.004 would round to a valid zero.
-- ---------------------------------------------------------------------------
CREATE TABLE public.billing_v2_records (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  record_type text NOT NULL,
  scheduled_on date,
  scheduled_time time without time zone,
  note_month date,
  title text,
  category text,
  payment_status text,
  payee_label text,
  amount numeric,
  currency_code text,
  event_type_label text,
  note_text text,
  closing_approval_follow_up boolean NOT NULL DEFAULT false,
  created_by_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_v2_record_type CHECK (
    record_type IN ('payment', 'event', 'month_note')
  ),
  CONSTRAINT billing_v2_category CHECK (
    category IS NULL OR category IN ('payroll', 'contractors_vendors')
  ),
  CONSTRAINT billing_v2_payment_status CHECK (
    payment_status IS NULL OR payment_status IN (
      'pending', 'scheduled', 'pending_approval', 'paid'
    )
  ),
  -- Exact cents, nonnegative, finite. NaN and the infinities fail the range test as well as
  -- the text test; both are kept because the text test states the intent.
  CONSTRAINT billing_v2_amount CHECK (
    amount IS NULL OR (
      amount::text NOT IN ('NaN', 'Infinity', '-Infinity')
      AND amount BETWEEN 0 AND 999999999999.99
      AND amount = trunc(amount, 2)
    )
  ),
  CONSTRAINT billing_v2_currency CHECK (
    currency_code IS NULL OR currency_code = 'USD'
  ),
  -- Nonblank predicate: tab through carriage return, ordinary space and the Unicode
  -- whitespace/BOM set that JavaScript's trim() removes. Keep the frontend tests matching.
  CONSTRAINT billing_v2_nonblank_title CHECK (
    title IS NULL OR title !~ U&'^[\0009-\000D\0020\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]*$'
  ),
  CONSTRAINT billing_v2_nonblank_payee CHECK (
    payee_label IS NULL OR payee_label !~ U&'^[\0009-\000D\0020\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]*$'
  ),
  CONSTRAINT billing_v2_nonblank_event CHECK (
    event_type_label IS NULL OR event_type_label !~ U&'^[\0009-\000D\0020\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]*$'
  ),
  CONSTRAINT billing_v2_nonblank_note CHECK (
    note_text IS NULL OR note_text !~ U&'^[\0009-\000D\0020\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]*$'
  ),
  CONSTRAINT billing_v2_days CHECK (
    (scheduled_on IS NULL OR scheduled_on BETWEEN DATE '0001-01-01' AND DATE '9999-12-31')
    AND (note_month IS NULL OR note_month BETWEEN DATE '0001-01-01' AND DATE '9999-12-31')
  ),
  CONSTRAINT billing_v2_month_start CHECK (
    note_month IS NULL OR extract(day FROM note_month) = 1
  ),
  -- `time(0)` would limit fractional seconds, not whole ones, so minute granularity needs
  -- its own predicate. PostgreSQL accepts TIME '24:00'; the calendar does not.
  CONSTRAINT billing_v2_minute_time CHECK (
    scheduled_time IS NULL OR (
      extract(second FROM scheduled_time) = 0 AND scheduled_time < TIME '24:00'
    )
  ),
  -- The subtype shape. Every predicate is written with an explicit IS NOT NULL: a CHECK
  -- also accepts UNKNOWN, so a missing `IS NOT NULL` would let a required field through.
  CONSTRAINT billing_v2_shape CHECK (
    (
      record_type = 'payment' AND scheduled_on IS NOT NULL AND note_month IS NULL
      AND title IS NOT NULL AND category IS NOT NULL AND payment_status IS NOT NULL
      AND payee_label IS NOT NULL AND currency_code IS NOT NULL AND event_type_label IS NULL
    ) OR (
      record_type = 'event' AND scheduled_on IS NOT NULL AND note_month IS NULL
      AND title IS NOT NULL AND category IS NULL AND payment_status IS NULL
      AND payee_label IS NULL AND amount IS NULL AND currency_code IS NULL
      AND closing_approval_follow_up = false
    ) OR (
      record_type = 'month_note' AND scheduled_on IS NULL AND scheduled_time IS NULL
      AND note_month IS NOT NULL AND title IS NULL AND category IS NULL
      AND payment_status IS NULL AND payee_label IS NULL AND amount IS NULL
      AND currency_code IS NULL AND event_type_label IS NULL
      AND closing_approval_follow_up = false AND note_text IS NOT NULL
    )
  )
);

COMMENT ON TABLE public.billing_v2_records IS
  'Billing v2: manually entered payment commitments, calendar events and month notes. '
  'One row is one manually entered obligation — a payroll total and its breakdown are not '
  'both entered and summed. Replaces nothing: legacy cobranzas_* stays untouched.';

COMMENT ON COLUMN public.billing_v2_records.scheduled_on IS
  'Due/planned date for a payment, event day otherwise. NOT the settlement date.';
COMMENT ON COLUMN public.billing_v2_records.scheduled_time IS
  'Local wall clock at minute granularity. No timezone conversion, no delivery instant.';
COMMENT ON COLUMN public.billing_v2_records.note_month IS
  'The month a month note belongs to, represented by its first day.';
COMMENT ON COLUMN public.billing_v2_records.payee_label IS
  'Free text: person, vendor or payroll group. Not a verified identity and not a copy of a '
  'usuarios display name.';
COMMENT ON COLUMN public.billing_v2_records.amount IS
  'NULL is unknown, 0 is an explicit zero. The two must never be collapsed.';
COMMENT ON COLUMN public.billing_v2_records.closing_approval_follow_up IS
  'Visible marker only. Not approval completion, not a scheduled notification.';
COMMENT ON COLUMN public.billing_v2_records.created_by_id IS
  'Who entered the row. Server-resolved from auth.uid(), never accepted from the browser. '
  'Nulled when the person is hard-deleted; never transferred to somebody else.';

-- ---------------------------------------------------------------------------
-- 2. Indexes (proposal section 7).
-- ---------------------------------------------------------------------------

-- Calendar: a date window over payments and events, with a stable tiebreaker.
CREATE INDEX billing_v2_scheduled_on_id_idx
  ON public.billing_v2_records (scheduled_on, id)
  WHERE record_type IN ('payment', 'event');

-- Upcoming/Overdue: unpaid payments compared with today in America/Guayaquil.
CREATE INDEX billing_v2_unpaid_due_id_idx
  ON public.billing_v2_records (scheduled_on, id)
  WHERE record_type = 'payment' AND payment_status <> 'paid';

-- One month note per month, globally: the dataset is shared, so the note belongs to the
-- group. A per-owner scope would need a different key.
CREATE UNIQUE INDEX billing_v2_one_note_per_month_idx
  ON public.billing_v2_records (note_month)
  WHERE record_type = 'month_note';

-- ---------------------------------------------------------------------------
-- 3. Creator and timestamps.
--
-- The creator rule is ASYMMETRIC on purpose. `created_by_id` is ON DELETE SET NULL, and
-- that nulling arrives as an ordinary UPDATE on this row: a blanket "creator is immutable"
-- check would RAISE and block the very user deletion the FK exists to allow. So:
--
--   existing creator -> NULL      passes (referential cleanup)
--   creator -> a DIFFERENT person raises (transferring authorship)
--   NULL    -> a person           raises (inventing authorship)
--
-- Reassigning who entered a payment is falsifying a financial record, which is why this is
-- a constraint and not a convention.
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.billing_v2_stamp_record()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = '' AS $$
DECLARE
  actor_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- STRICT: no profile for this session means the insert fails closed. The lookup runs as
    -- the invoker and is therefore subject to `usuarios` RLS, deliberately.
    SELECT u.id INTO STRICT actor_id
    FROM public.usuarios u WHERE u.auth_id = auth.uid();
    NEW.created_by_id := actor_id;
    NEW.created_at := now();
    NEW.updated_at := now();
  ELSE
    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.record_type IS DISTINCT FROM OLD.record_type
      OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Billing record identity and creation time are immutable';
    END IF;
    IF NEW.created_by_id IS DISTINCT FROM OLD.created_by_id
      AND NEW.created_by_id IS NOT NULL THEN
      RAISE EXCEPTION 'Billing authorship cannot be transferred';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.billing_v2_stamp_record() IS
  'Creation attribution, not edit history. Overwrites any browser-supplied creator and '
  'timestamps on INSERT; on UPDATE it allows created_by_id to become NULL (ON DELETE SET '
  'NULL) and refuses every other change to it.';

-- Trigger names decide the order: `stamp_record` runs before `update_timestamp`, so the
-- immutability checks see the row before update_updated_at() bumps updated_at.
CREATE TRIGGER billing_v2_stamp_record
BEFORE INSERT OR UPDATE ON public.billing_v2_records
FOR EACH ROW EXECUTE FUNCTION public.billing_v2_stamp_record();

CREATE TRIGGER billing_v2_update_timestamp
BEFORE UPDATE ON public.billing_v2_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Grants and RLS.
--
-- Module-wide authorization: anyone holding `cobranzas` reads, creates, edits and deletes
-- every row, paid ones included. The policies ALSO require `usuarios.activo`, because
-- has_module() checks role and not activo: without the EXISTS, a deactivated person keeps
-- full access until their JWT expires. The shared helper is left alone — around ten modules
-- depend on it and changing it here would alter their behaviour as a side effect.
-- ---------------------------------------------------------------------------
ALTER TABLE public.billing_v2_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_v2_records FROM anon;
REVOKE ALL ON public.billing_v2_records FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_v2_records TO authenticated;

DO $$
DECLARE
  module_slug_constant constant text := 'cobranzas';
  billing_predicate text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.role_modules
    WHERE module_slug = module_slug_constant
  ) THEN
    RAISE EXCEPTION 'Missing module grant baseline: %', module_slug_constant;
  END IF;

  billing_predicate := format(
    'public.has_module(%L) AND EXISTS ('
      'SELECT 1 FROM public.usuarios u WHERE u.auth_id = auth.uid() AND u.activo)',
    module_slug_constant
  );

  EXECUTE format(
    'CREATE POLICY billing_v2_select ON public.billing_v2_records '
    'FOR SELECT TO authenticated USING (%s)', billing_predicate
  );
  EXECUTE format(
    'CREATE POLICY billing_v2_insert ON public.billing_v2_records '
    'FOR INSERT TO authenticated WITH CHECK (%s)', billing_predicate
  );
  EXECUTE format(
    'CREATE POLICY billing_v2_update ON public.billing_v2_records '
    'FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',
    billing_predicate, billing_predicate
  );
  EXECUTE format(
    'CREATE POLICY billing_v2_delete ON public.billing_v2_records '
    'FOR DELETE TO authenticated USING (%s)', billing_predicate
  );
END $$;
