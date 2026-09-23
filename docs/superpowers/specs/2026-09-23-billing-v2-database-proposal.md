# Billing v2 database proposal

Date: 2026-09-23
Status: adversarially reviewed proposal — NOT approved DDL, NOT an executable migration.

Related documents:

- [Working design](2026-09-23-billing-v2-working-notes.md): confirmed route, naming, permission and reminder decisions.
- [Implementation plan](../plans/2026-09-23-billing-v2.md): decision checkpoint before database/UI implementation.

The replacement table name and legacy retention are confirmed. The user now also asks for the simplest workable recipient model until payroll granularity is revisited. Exact columns, monetary policy, record cardinality and row permissions remain proposals. No database has been changed.

## 1. Review outcome and decision boundary

Two independent reviewers ran with `gpt-6-astra` and `ultra` reasoning: one reviewed SQL/integrity/security; the other reviewed CRM/domain semantics. Because their shell approvals were not visible to the user, main obtained authorized, line-numbered local source reads and supplied them to both. Main separately inspected Canva's public form and inline application code. These are static reviews, not database execution tests or a fresh production audit.

| Finding | Disposition in this revision |
|---|---|
| `numeric(14,2)` rounds before CHECK; `-0.004` can become valid zero | Propose unscaled `numeric` with exact-cent and range constraints instead; no silent rounding |
| `btrim(text)` alone accepts tab/newline-only text | Replace with a nonblank predicate covering the whitespace set used by JavaScript trim |
| Generic names hide field meaning | `payee_label`, `note_text`, `event_type_label`, `closing_approval_follow_up`, `currency_code` make their contracts explicit |
| Mandatory person FK would assume individual payroll | Defer linkage; use a manual recipient label, including collective payroll, without a supplier/payroll master |
| Unknown amounts could appear as confirmed zero in totals | Keep nullable amount; show known subtotal plus count of unknown amounts; export unknown as empty |
| Creator RESTRICT conflicts with existing deletion guidance | Keep as an exposed alternative, not an approved behavior; require deletion-flow decision before migration |
| `has_module` does not check `usuarios.activo` | Expose an offboarding/RLS approval gate; do not claim deactivation already revokes direct access |
| Currency is nullable only outside payments | Not a missing-currency loophole: the payment shape requires USD. Compare explicit per-row unit versus global USD below |

The reviewers found no required-field NULL loophole in the subtype CHECK. The current staff-read policy supports an invoker creator lookup, and the proposed date/month indexes match the stated queries. These positives do not replace local tests.

## 2. Canva evidence and corrected mapping

Reference: [published payment calendar](https://eminatcollections.my.canva.site/calendario-din-mico-de-pagos), inspected read-only on 2026-09-23. No records were created, edited or deleted.

| Canva field / behavior | What is actually observed | Proposed billing mapping |
|---|---|---|
| `record_type` | Pago, Evento, Nota del mes selected by the user | Closed `record_type` values, translated labels |
| `date` | Fecha; full day for payments/events, YYYY-MM for monthly notes | `scheduled_on` or `note_month`, never both |
| `time` | Optional time input | Optional local wall-clock `scheduled_time` |
| `person_or_vendor` | Required free text labelled Vendor o Contractor | `payee_label`; no verified identity implied |
| `concept`, `title` | One form input copied to multiple fields for events | One `title` |
| `amount`, `has_amount` | Blank saves 0 plus false; normalization subsequently treats an existing 0 as an amount | Nullable `amount`; preserve unknown versus explicit zero |
| Currency | USD hardcoded in the formatter; no saved currency field or currency selector | USD is a proposed business contract, not a discovered database column |
| `status` | Manual payment-state selection | `payment_status`; not derived from dates or amount |
| `event_type` | Optional plain text labelled Tipo de evento, no catalog | `event_type_label`; not record type or a workflow event |
| `note`, `month_note` | One Nota input stored according to record type | `note_text`; plain text, not JSON, HTML or an HTTP body |
| `cutoff_reminder` | Checkbox labelled Recordatorio de cierre / aprobación | `closing_approval_follow_up`; manual marker, not a scheduled notification |
| `record_id`, backend identity | Two identifiers | One application UUID; import identity would be designed separately |
| `event_color` | Empty value in saves; rendered colors chosen by presentation rules | Domain/view projection, not persisted |

The inspected application reads/writes `dataSdk` records and mentions a linked Canva Sheet in an error. That reveals an application contract, not SQL DDL, foreign keys, RLS or backend scheduling. No automatic delivery behavior was found in the inspected application script.

Canva labels the date only Fecha. Interpreting a payment's selected calendar date as the due/planned-payment date for approved Upcoming/Overdue groups is our proposed interpretation, not proof of an invoice deadline. It is not the actual settlement date. Keep that distinction visible in the editor and approve it before implementation; do not add a second duplicate date without a distinct requirement.

## 3. CRM recipients and the low-cost choice

Verified local structures:

- `usuarios.id` identifies a CRM person. `auth_id` is nullable: a person can exist without a login. A future person FK is technically possible without granting the recipient an account (`src/shared/context/loadAppData.ts:21–42`).
- `empresas` describes organizational membership and attribution, not a demonstrated vendor master. `usuarios.empresa_id` replaced the old company-name text (`20260807233810_empresas_catalogo_pertenencia.sql`). Do not infer the paying entity from the creator's employer.
- `vinculaciones` and `jornadas` are relationship/workload catalogs, not individual employment contracts or payroll amounts (`20260808190614_jornadas_catalogo.sql`).
- `paciente_contactos` stores a patient's phone/email values, not generic payees (`20260824001303_paciente_contactos.sql`).
- The inspected shared table registry exposes no explicit supplier master. This is bounded repository evidence, not proof about every production object.

The user could not yet choose individual versus aggregated payroll and requested the simplest workable solution, with improvements discussed later. Recommendation: a required manual `payee_label` for payments. It can describe a person, supplier or payroll group. It is neither a copied CRM display name nor a promise of verified identity; do not populate it automatically from `usuarios` while pretending the relationship is maintained.

Defer `payee_user_id`, a supplier master, payroll detail rows and a recipient-type discriminator. If person linkage becomes necessary, prefer `usuarios.id` for real CRM people, derive their display names via the relation, and design how external/group recipients coexist. Do not force external suppliers into patient tables or create artificial login accounts. Historical/inactive people need consideration; `usuariosRepo.listActivos` alone would omit them.

One record represents one manually entered payment commitment. Do not enter both a payroll total and its individual breakdown as separate obligations to be summed together. This first version does not calculate payroll or claim it can automatically deduplicate overlapping commitments.

## 4. Table alternatives and retained objects

| Alternative | Shape | Trade-off |
|---|---|---|
| A — recommended initially | One `billing_v2_records` table: payment/event/month-note variants | One repository/feed; applicability enforced by subtype checks; nullable variant-specific fields |
| B | Payment/event records plus monthly-note table | Cleaner note ownership/uniqueness if it differs; extra query/policy surface |
| C | Separate payment, event and monthly-note tables | Stronger separation if permissions/lifecycles diverge; more data operations and feed adapters |

Canva's common JS collection motivates A but does not prove its physical schema. Presentation reuse does not require one physical table. Keep A as the low-cost recommendation, not a user-approved table count.

After approval, A creates one business table, one billing creator trigger function, two triggers, three secondary indexes and four operation-specific RLS policies. Reuse `usuarios(id)`, its unique `auth_id` mapping, `has_module(text)`, `update_updated_at()`, the shared authenticated client and table-name registry.

Leave `cobranzas_ventas`, `cobranzas_cuentas`, `cobranzas_depositos`, grants and legacy data unchanged. Do not create category/status catalogs, a supplier master, notification queue, currency catalog, audit table or view-specific storage. Calendar/Table/Kanban are projections, not separate business entities.

## 5. Source-data and field contract

All exact columns and constraints below remain proposed. Manual inputs are source facts even when their values come from a fixed domain list. Generated identity, creator and timestamps are system metadata worth retaining; “do not store derived data” does not mean removing attribution.

| Column | PostgreSQL type | Applicability / nullability | Nature and precise meaning |
|---|---|---|---|
| `id` | `uuid` | Required PK, UUID default | System identity, not a duplicate Canva ID |
| `record_type` | `text` | Required: payment/event/month_note | Manually selected discriminator |
| `scheduled_on` | `date` | Required payment/event, null note | Manual calendar date; proposed due/planned-date interpretation for payments, event day otherwise |
| `scheduled_time` | `time without time zone` | Optional payment/event, null note | Manual local time at minute granularity; not a delivery instant |
| `note_month` | `date` | Required monthly note only | Manual month represented by its first day; not derived from another stored date |
| `title` | `text` | Required payment/event, null note | Manual concept/title, one source |
| `category` | `text` | Required payment only | Manual classification: payroll / contractors_vendors |
| `payment_status` | `text` | Required payment only, no default | Manual pending / scheduled / pending_approval / paid; not inferred from time |
| `payee_label` | `text` | Required payment only | Manual recipient description; individual, supplier or collective |
| `amount` | `numeric` | Optional payment only | Manual USD amount under proposed currency contract; null unknown, 0 explicit zero |
| `currency_code` | `text` | Required USD on payment, null otherwise | Explicit unit in the current sketch, not derived from amount; global-constant alternative below |
| `event_type_label` | `text` | Optional event only | Manual free-text event subtype, no catalog or FK |
| `note_text` | `text` | Required monthly note; optional payment/event | Manual plain-text note, not a generic opaque payload |
| `closing_approval_follow_up` | `boolean` | Required, default false; false outside payment | Manual closing/approval follow-up marker, not approval completion or a send instruction |
| `created_by_id` | `uuid` | Required in RESTRICT alternative | Attribution FK to usuarios.id; server resolves auth identity, not the payee |
| `created_at` | `timestamptz` | Required, server set | Creation metadata |
| `updated_at` | `timestamptz` | Required, server maintained | Last-write metadata, not an audit trail or concurrency version |

### Currency: why NULL, and whether to keep a column

In the original proposal, a payment could NOT have NULL currency: its subtype CHECK required a value. NULL meant “not applicable” for events/monthly notes. Giving a note USD merely to make the whole column NOT NULL would misrepresent the data.

Two valid choices remain open:

1. **Global USD, simplest if confirmed:** omit `currency_code`; use one immutable USD domain contract for input, display and exports. A future currency change needs explicit migration/versioning; changing a formatter must never reinterpret existing amounts.
2. **Explicit stored unit, used in the current review sketch:** keep `currency_code` required on payments, initially constrained to USD. This duplicates a proposed constant but preserves the unit on each row. It is not derivable from the amount itself.

Reviewer B recommends option 1 if global USD is confirmed. This revision does not silently approve USD-only or remove the unit before that choice. There is no need for a currency catalog or conversion engine in either initial option.

### What must not be persisted

- `has_amount`: derive from `amount IS NOT NULL`.
- Upcoming/Overdue/is_paid flags: derive reminder eligibility from the manual status and date; do not create another independently writable paid flag.
- Totals, known-amount counts, month/year copies of a full date, formatted money, translated labels and theme colors: projections.
- Duplicate concept/title or note/month-note content for a single record.
- A copied recipient display name alongside a future person FK, unless an explicit historical-snapshot requirement is approved.

The follow-up checkbox cannot be derived from pending_approval: one describes an intended follow-up, the other a manually declared payment state. For now propose a visible marker only; it does not filter the approved unpaid groups, dispatch messages, store a cutoff timestamp, or imply approval happened. Its release behavior still needs approval.

### Amount and temporal validation

Propose nonnegative exact cents, optional amount and maximum 999999999999.99. Reject excess nonzero fractional digits, negative values, NaN and infinities. Use unscaled `numeric` so validation sees the input before rounding; `numeric(14,2)` coerces scale first, allowing a negative sub-cent input to become zero. [PostgreSQL numeric documentation](https://www.postgresql.org/docs/current/datatype-numeric.html).

Use decimal-safe arithmetic/serialization, not unchecked JavaScript floating-point totals. Summary displays the known subtotal plus the count of payments with unknown amounts. CSV represents unknown as empty and explicit zero as zero. Amount is manually entered, not computed from jornada or membership.

Use date-only values for grouping. Propose the ISO year range 0001–9999 for UI compatibility, valid finite dates, and a first-day month sentinel. Time remains a local wall-clock value: no timezone conversion, payment instant or future email schedule is inferred. `time(0)` limits fractional seconds, not whole seconds, so a separate minute-granularity constraint is necessary. [PostgreSQL date/time documentation](https://www.postgresql.org/docs/current/datatype-datetime.html). Business timezone defining today remains open.

## 6. Proposed table and constraints — review sketch

Do not run this as a migration. It shows the explicit-currency and creator-RESTRICT alternatives, both still subject to approval. The nonblank pattern covers tab through carriage return, ordinary space and the Unicode whitespace/BOM set trimmed by JavaScript; keep matching frontend tests. Optional blank inputs normalize to NULL.

```sql
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
  created_by_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
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
  CONSTRAINT billing_v2_minute_time CHECK (
    scheduled_time IS NULL OR (
      extract(second FROM scheduled_time) = 0 AND scheduled_time < TIME '24:00'
    )
  ),
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
```

Explicit IS NOT NULL predicates are important: an SQL CHECK also accepts UNKNOWN. This sketch's subtype checks must remain aligned with the domain discriminated union. [PostgreSQL constraint documentation](https://www.postgresql.org/docs/current/ddl-constraints.html).

## 7. Indexes and query coverage

```sql
CREATE INDEX billing_v2_scheduled_on_id_idx
  ON public.billing_v2_records (scheduled_on, id)
  WHERE record_type IN ('payment', 'event');

CREATE INDEX billing_v2_unpaid_due_id_idx
  ON public.billing_v2_records (scheduled_on, id)
  WHERE record_type = 'payment' AND payment_status <> 'paid';

CREATE UNIQUE INDEX billing_v2_one_note_per_month_idx
  ON public.billing_v2_records (note_month)
  WHERE record_type = 'month_note';
```

- Calendar: date range with scheduled_on/id ordering; fetch the selected month's note separately.
- Upcoming/Overdue: payment + not paid, compared with businessToday; horizon remains a separate decision.
- Monthly uniqueness: one note per month across the proposed shared dataset is still unapproved. Company/owner scope would change the unique key.
- Summary: approved reporting period, not automatically the visible calendar's six-week grid. Show unknown-amount count alongside known subtotal.
- Data: bounded deterministic pagination; no silent 1,000-row truncation or moving updated_at offsets.
- Do not add indexes to every column; measure search/category and creator-FK lookup needs.

## 8. Creator, timestamps and user deletion

Resolve creator from `usuarios.auth_id = auth.uid()` to `usuarios.id`; never use the payee or accept a form-supplied actor. Current `es_personal` SELECT policy and authenticated SELECT grant support this lookup (`20260911013928_es_personal_y_usuarios.sql:29–44,69–74`). Do not switch to SECURITY DEFINER just to avoid testing it.

Proposed behavior in the RESTRICT alternative:

- INSERT: resolve exactly one app user, reject missing profile, overwrite creator and both timestamps.
- UPDATE: reject changes to id, record_type, creator or created_at; reuse update_updated_at for update time.
- Ordinary mutation payloads omit actor/timestamps. Imports/maintenance need an explicitly reviewed path, not a client bypass.

```sql
CREATE FUNCTION public.billing_v2_stamp_record()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = '' AS $$
DECLARE
  actor_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT u.id INTO STRICT actor_id
    FROM public.usuarios u WHERE u.auth_id = auth.uid();
    NEW.created_by_id := actor_id;
    NEW.created_at := now();
    NEW.updated_at := now();
  ELSE
    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.record_type IS DISTINCT FROM OLD.record_type
      OR NEW.created_by_id IS DISTINCT FROM OLD.created_by_id
      OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Billing record identity and creator are immutable';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER billing_v2_stamp_record
BEFORE INSERT OR UPDATE ON public.billing_v2_records
FOR EACH ROW EXECUTE FUNCTION public.billing_v2_stamp_record();

CREATE TRIGGER billing_v2_update_timestamp
BEFORE UPDATE ON public.billing_v2_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

This is creation attribution, not edit history, historical-name snapshot or complete financial auditability.

**Integration gate:** `src/app/api/admin/delete-user/route.ts:108–138` handles FK failures with task-reassignment/deactivation guidance. A creator RESTRICT would also block deletion for a person with zero assigned tasks; transferring tasks cannot release that billing reference. If RESTRICT is chosen, add billing-aware guidance without transferring historical authorship. The existing handler deletes the profile before Auth; the review did not find an Auth-first orphaning issue here.

If hard deletion must remain available, consider nullable creator + ON DELETE SET NULL, as used by activities, but redesign creator immutability at the same time: simply changing the FK while keeping the current trigger would reject the referential nulling update. Do not silently choose either retention policy. Exact reassignment-RPC behavior was not verified in this review.

## 9. Proposed access and offboarding gates

This is an unapproved shared-dataset policy, not a consequence of naming the route `/billing`.

| Caller | Select | Insert | Update | Delete |
|---|---|---|---|---|
| Anonymous | No | No | No | No |
| Authenticated without cobranzas | No | No | No | No |
| User with cobranzas | All billing rows | Yes | All billing rows | All billing rows |
| Admin recognized by has_module | All billing rows | Yes | All billing rows | All billing rows |

Global payroll visibility and editing/deleting paid rows require explicit approval. Physical deletion and no edit history are shown here for review, not silently authorized. Company isolation, owner scope or paid-row retention would change both policy and schema.

**Conditional security blocker:** the existing `has_module` and `is_admin` helpers check identity/role, not `usuarios.activo` (`20260624210414_dynamic_roles.sql:58–68`). Deactivation plus a still-valid JWT therefore does not, by itself, revoke direct Billing API access in this sketch. If Deactivate means access revocation, require active membership in Billing RLS or an approved offboarding flow that removes authorization. Test SELECT/INSERT/UPDATE/DELETE with an already-issued JWT. Do not silently modify the shared helper for unrelated modules.

```sql
ALTER TABLE public.billing_v2_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_v2_records FROM anon;
REVOKE ALL ON public.billing_v2_records FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_v2_records TO authenticated;

DO $$
DECLARE
  module_slug_constant constant text := 'cobranzas';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.role_modules WHERE module_slug = module_slug_constant
  ) THEN
    RAISE EXCEPTION 'Missing module baseline: %', module_slug_constant;
  END IF;

  EXECUTE format(
    'CREATE POLICY billing_v2_select ON public.billing_v2_records FOR SELECT TO authenticated USING (public.has_module(%L))',
    module_slug_constant
  );
  EXECUTE format(
    'CREATE POLICY billing_v2_insert ON public.billing_v2_records FOR INSERT TO authenticated WITH CHECK (public.has_module(%L))',
    module_slug_constant
  );
  EXECUTE format(
    'CREATE POLICY billing_v2_update ON public.billing_v2_records FOR UPDATE TO authenticated USING (public.has_module(%L)) WITH CHECK (public.has_module(%L))',
    module_slug_constant, module_slug_constant
  );
  EXECUTE format(
    'CREATE POLICY billing_v2_delete ON public.billing_v2_records FOR DELETE TO authenticated USING (public.has_module(%L))',
    module_slug_constant
  );
END $$;
```

This preserves the existing permission slug without distributing new grants. It is not release-ready until offboarding and shared access are resolved. Convert only approved DDL into one transaction; a missing-grant check must not leave partial objects. Test actual authenticated users, not service-role access that bypasses RLS.

## 10. Verification and approval sequence

Required before implementation signoff:

- Required subtype fields reject NULL; event/note reject payment-only fields.
- If explicit currency is chosen: payment NULL currency rejected; USD stored even if amount unknown; events/notes have no currency.
- Null amount and zero round-trip through editor, views and CSV distinctly. Reject -0.004, 0.004, 1.005, negative/nonfinite/out-of-range values under the exact-cent proposal; accept values mathematically equal to cents such as 1.2300.
- Required text rejects empty, spaces, tabs, line breaks, NBSP and BOM-only input; preserve real multiline notes. Keep frontend and SQL whitespace behavior aligned.
- Validate date/month boundaries, leap dates, first-day month sentinel, minute precision and rejection of 24:00.
- Concurrent monthly-note creation has the approved uniqueness behavior and a useful conflict message.
- Forged creator ignored on insert; changing id/type/creator/created_at rejected in the selected attribution design.
- Current usuarios RLS permits legitimate profile resolution; missing profile fails closed.
- Direct PostgREST tests cover anonymous, no-module, finance, admin and deactivated profile with an existing JWT, plus approved company/owner scope and paid-record restrictions.
- User deletion/reassignment has accurate billing-aware behavior under the chosen FK; do not rewrite historical creator attribution.
- Paid rows remain in general views, excluded from reminders; events/month notes never counted as payments. Unknown totals remain visibly incomplete.
- Legacy data/grants unchanged; no reset, production fixtures or unapproved deployment.

Discuss product choices one at a time:

1. Confirm recipient-label scope under the user's simple-first direction; strict CRM linkage remains deferred.
2. Choose global USD versus stored currency unit, and exact-cent/zero/negative rules.
3. Confirm payment date meaning and visible-only follow-up marker; retain approved reminder split.
4. Approve shared visibility/edit/delete rights, offboarding semantics and creator deletion policy.
5. Confirm table layout, monthly uniqueness, record-type immutability, timezone and reporting period.

Then finalize the schema, DTOs and tests in Task 1, and author a real migration in Task 5. The new money, whitespace and time predicates above were statically reviewed/documented but have not been executed against PostgreSQL. No new notification table is needed for derived in-app reminder lists.
