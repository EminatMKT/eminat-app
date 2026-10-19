-- Additive commercial operations. No QuickBooks, Stripe, or real payment collection.
-- Sales payments are staff-recorded commercial evidence, not money movement.

CREATE TABLE public.sales_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.sales_organizations(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN ('NOTE','TASK','CALL_ATTEMPT','MEETING','EMAIL','FOLLOW_UP')),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 240),
  body text,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','COMPLETED','CANCELLED','FAILED')),
  priority text NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW','MEDIUM','HIGH')),
  actor_member_id uuid NOT NULL,
  assignee_member_id uuid,
  lead_id uuid,
  contact_id uuid,
  account_id uuid,
  opportunity_id uuid,
  due_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  email_to text,
  email_provider_id text,
  email_delivery_status text,
  idempotency_key text,
  legacy_annie_id uuid,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- ANNIE permits general tasks without a CRM parent. Their actor/assignee
  -- remains the authorization boundary in the native inbox.
  CHECK (num_nonnulls(lead_id, contact_id, account_id, opportunity_id) >= 1
    OR kind = 'TASK'),
  FOREIGN KEY (organization_id, actor_member_id) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, assignee_member_id) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, lead_id) REFERENCES public.sales_leads(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, contact_id) REFERENCES public.sales_contacts(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, account_id) REFERENCES public.sales_accounts(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, opportunity_id) REFERENCES public.sales_opportunities(organization_id, id) ON DELETE RESTRICT,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, legacy_annie_id),
  UNIQUE (organization_id, idempotency_key)
);
CREATE INDEX sales_activities_assignee_idx ON public.sales_activities (organization_id, assignee_member_id, status, due_at);
CREATE INDEX sales_activities_lead_idx ON public.sales_activities (organization_id, lead_id, created_at DESC);
CREATE INDEX sales_activities_opportunity_idx ON public.sales_activities (organization_id, opportunity_id, created_at DESC);

CREATE TABLE public.sales_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.sales_organizations(id) ON DELETE RESTRICT,
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 240),
  description text,
  organizer_member_id uuid NOT NULL,
  assignee_member_id uuid NOT NULL,
  participants jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(participants) = 'array'),
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  timezone text NOT NULL,
  location text,
  virtual_url text,
  lead_id uuid,
  contact_id uuid,
  account_id uuid,
  opportunity_id uuid,
  notes text,
  outcome text,
  status text NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED','COMPLETED','CANCELLED','NO_SHOW')),
  legacy_annie_id uuid,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at > start_at),
  FOREIGN KEY (organization_id, organizer_member_id) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, assignee_member_id) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, lead_id) REFERENCES public.sales_leads(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, contact_id) REFERENCES public.sales_contacts(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, account_id) REFERENCES public.sales_accounts(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, opportunity_id) REFERENCES public.sales_opportunities(organization_id, id) ON DELETE RESTRICT,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, legacy_annie_id)
);
CREATE INDEX sales_meetings_assignee_idx ON public.sales_meetings (organization_id, assignee_member_id, start_at);

CREATE TABLE public.sales_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.sales_organizations(id) ON DELETE RESTRICT,
  opportunity_id uuid NOT NULL,
  owner_member_id uuid NOT NULL,
  team_id uuid,
  amount numeric(18,2) NOT NULL CHECK (amount >= 0),
  currency varchar(3) NOT NULL,
  paid_at date NOT NULL,
  reference text,
  idempotency_key text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  legacy_annie_id uuid,
  FOREIGN KEY (organization_id, opportunity_id) REFERENCES public.sales_opportunities(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, owner_member_id) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, team_id) REFERENCES public.sales_teams(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, created_by) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, idempotency_key),
  UNIQUE (organization_id, legacy_annie_id)
);

CREATE TABLE public.sales_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.sales_organizations(id) ON DELETE RESTRICT,
  code text NOT NULL CHECK (length(btrim(code)) BETWEEN 1 AND 32),
  code_number bigint,
  primary_contact_id uuid NOT NULL,
  opportunity_id uuid,
  sales_payment_id uuid,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  email text,
  address text,
  membership_type text NOT NULL CHECK (membership_type IN ('INDIVIDUAL','FAMILY','LEGACY_UNSPECIFIED')),
  plan text NOT NULL CHECK (plan IN ('ESSENTIAL','PLUS','MAX','LEGACY_UNSPECIFIED')),
  duration text NOT NULL CHECK (duration IN ('MONTHLY','2M','3M','6M','12M','LEGACY_UNSPECIFIED')),
  legacy_membership_type_label text,
  legacy_plan_label text,
  legacy_duration_label text,
  legacy_modality_label text,
  monthly_price_cents integer CHECK (monthly_price_cents >= 0),
  total_price_cents integer CHECK (total_price_cents >= 0),
  visit_fee_cents integer CHECK (visit_fee_cents >= 0),
  included_visits integer CHECK (included_visits >= 0),
  issued_at date NOT NULL,
  expires_at date NOT NULL,
  status text NOT NULL CHECK (status IN ('ACTIVE','EXPIRED','CANCELLED','PENDING')),
  seller_member_id uuid NOT NULL,
  team_id uuid,
  sale_date date NOT NULL,
  amount numeric(18,2) NOT NULL CHECK (amount >= 0),
  currency varchar(3) NOT NULL DEFAULT 'USD',
  payment_reference text,
  payment_confirmed_at timestamptz,
  is_demo boolean NOT NULL DEFAULT false,
  pdf_storage_key text,
  pdf_version integer NOT NULL DEFAULT 0 CHECK (pdf_version >= 0),
  pdf_generated_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  legacy_annie_id uuid,
  CHECK (expires_at > issued_at),
  -- Unknown historical values remain explicit; new issuance cannot use them.
  CHECK (legacy_annie_id IS NOT NULL OR (plan<>'LEGACY_UNSPECIFIED'
    AND membership_type<>'LEGACY_UNSPECIFIED' AND duration NOT IN ('2M','LEGACY_UNSPECIFIED')
    AND monthly_price_cents IS NOT NULL AND total_price_cents IS NOT NULL
    AND visit_fee_cents IS NOT NULL AND included_visits IS NOT NULL)),
  -- A newly issued non-demo membership needs one recorded SalesPayment.
  -- Historical ANNIE rows may have a distinct legacy payment-order reference.
  CHECK (status <> 'ACTIVE' OR is_demo OR legacy_annie_id IS NOT NULL OR sales_payment_id IS NOT NULL),
  FOREIGN KEY (organization_id, primary_contact_id) REFERENCES public.sales_contacts(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, opportunity_id) REFERENCES public.sales_opportunities(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, sales_payment_id) REFERENCES public.sales_payments(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, seller_member_id) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, team_id) REFERENCES public.sales_teams(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, created_by) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, code),
  UNIQUE (organization_id, code_number),
  UNIQUE (organization_id, sales_payment_id),
  UNIQUE (organization_id, legacy_annie_id)
);
CREATE INDEX sales_memberships_seller_idx ON public.sales_memberships (organization_id, seller_member_id, sale_date DESC);
CREATE INDEX sales_memberships_expiry_idx ON public.sales_memberships (organization_id, status, expires_at);

CREATE TABLE public.sales_membership_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  membership_id uuid NOT NULL,
  starts_at date NOT NULL,
  expires_at date NOT NULL,
  plan text NOT NULL CHECK (plan IN ('ESSENTIAL','PLUS','MAX','LEGACY_UNSPECIFIED')),
  duration text NOT NULL CHECK (duration IN ('MONTHLY','2M','3M','6M','12M','LEGACY_UNSPECIFIED')),
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  legacy_plan_label text,
  legacy_duration_label text,
  legacy_modality_label text,
  legacy_annie_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > starts_at),
  CHECK (legacy_annie_id IS NOT NULL OR (plan<>'LEGACY_UNSPECIFIED'
    AND duration NOT IN ('2M','LEGACY_UNSPECIFIED'))),
  FOREIGN KEY (organization_id, membership_id) REFERENCES public.sales_memberships(organization_id, id) ON DELETE RESTRICT,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, legacy_annie_id)
);
CREATE INDEX sales_membership_periods_membership_idx ON public.sales_membership_periods (organization_id, membership_id, starts_at);

CREATE TABLE public.sales_household_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  membership_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  relationship text NOT NULL CHECK (relationship IN ('PRIMARY','SPOUSE','CHILD','PARENT','OTHER')),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REMOVED')),
  member_index smallint NOT NULL CHECK (member_index BETWEEN 1 AND 3),
  approved_by uuid,
  approved_at timestamptz,
  legacy_annie_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, membership_id) REFERENCES public.sales_memberships(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, contact_id) REFERENCES public.sales_contacts(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, approved_by) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, legacy_annie_id)
);
CREATE UNIQUE INDEX sales_household_one_active_primary ON public.sales_household_members (organization_id, membership_id)
  WHERE relationship = 'PRIMARY' AND status = 'ACTIVE';
CREATE UNIQUE INDEX sales_household_active_contact ON public.sales_household_members (organization_id, membership_id, contact_id)
  WHERE status = 'ACTIVE';
CREATE UNIQUE INDEX sales_household_active_slot ON public.sales_household_members (organization_id, membership_id, member_index)
  WHERE status = 'ACTIVE';

CREATE TABLE public.sales_family_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  membership_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  requested_contact_id uuid,
  first_name text NOT NULL CHECK (length(btrim(first_name)) > 0),
  last_name text NOT NULL CHECK (length(btrim(last_name)) > 0),
  date_of_birth date,
  relationship text NOT NULL CHECK (relationship IN ('SPOUSE','CHILD','PARENT','OTHER')),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  issued_household_member_id uuid,
  reason text,
  idempotency_key text NOT NULL,
  legacy_annie_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, membership_id) REFERENCES public.sales_memberships(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, requested_by) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, requested_contact_id) REFERENCES public.sales_contacts(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, reviewed_by) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, issued_household_member_id) REFERENCES public.sales_household_members(organization_id, id) ON DELETE RESTRICT,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, idempotency_key),
  UNIQUE (organization_id, legacy_annie_id)
);
CREATE UNIQUE INDEX sales_family_requests_pending_contact ON public.sales_family_requests
  (organization_id, membership_id, requested_contact_id)
  WHERE status = 'PENDING' AND requested_contact_id IS NOT NULL;

CREATE TABLE public.sales_renewal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  membership_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED','FULFILLED')),
  requested_plan text CHECK (requested_plan IN ('ESSENTIAL','PLUS','MAX')),
  requested_duration text CHECK (requested_duration IN ('MONTHLY','3M','6M','12M')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  decision_note text,
  idempotency_key text NOT NULL,
  legacy_annie_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, membership_id) REFERENCES public.sales_memberships(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, requested_by) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, reviewed_by) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, idempotency_key),
  UNIQUE (organization_id, legacy_annie_id)
);
CREATE UNIQUE INDEX sales_renewal_one_pending ON public.sales_renewal_requests (organization_id, membership_id)
  WHERE status = 'PENDING';

CREATE TABLE public.sales_report_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.sales_organizations(id) ON DELETE RESTRICT,
  report_code text NOT NULL,
  cadence text NOT NULL CHECK (cadence IN ('DAILY','WEEKLY')),
  timezone text NOT NULL,
  recipient_roles text[] NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  last_run_at timestamptz,
  last_status text,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, created_by) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  UNIQUE (organization_id, id)
);

CREATE TABLE public.sales_report_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  schedule_id uuid NOT NULL,
  recipient_member_id uuid NOT NULL,
  period_key text NOT NULL,
  status text NOT NULL CHECK (status IN ('PENDING','SENT','FAILED')),
  report_path text,
  provider_message_id text,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  FOREIGN KEY (organization_id, schedule_id) REFERENCES public.sales_report_schedules(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, recipient_member_id) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  UNIQUE (organization_id, schedule_id, recipient_member_id, period_key)
);

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'sales_activities','sales_meetings','sales_payments','sales_memberships',
    'sales_membership_periods','sales_household_members','sales_family_requests',
    'sales_renewal_requests','sales_report_schedules','sales_report_deliveries'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated, service_role', table_name);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', table_name);
  END LOOP;
END $$;
