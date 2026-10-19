-- Native LILLY Sales persistence. Additive and deliberately empty: reviewed
-- tenant/user bindings and ANNIE migration are separate, gated operations.
-- Browser roles receive no direct access. All queries go through authenticated
-- LILLY server routes that enforce organization, role, owner, and team scope.

CREATE TABLE public.sales_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 160),
  legacy_annie_id uuid UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'disabled')),
  approved_by uuid REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'active' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL))
);

CREATE TABLE public.sales_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.sales_organizations(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 160),
  legacy_annie_id uuid,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, legacy_annie_id),
  UNIQUE (organization_id, name)
);

-- Prevent a Sales membership from pairing one LILLY profile with a different
-- Supabase login. Existing rows require no rewrite; id is already unique.
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_id_auth_id_sales_unique UNIQUE (id, auth_id);

CREATE TABLE public.sales_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.sales_organizations(id) ON DELETE RESTRICT,
  -- Imported ANNIE actors can be preserved without creating a login. Only
  -- explicitly bound, active members may authenticate or receive new work.
  user_id uuid,
  auth_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  display_name text CHECK (display_name IS NULL OR length(btrim(display_name)) BETWEEN 1 AND 160),
  role text NOT NULL CHECK (role IN ('SUPERADMIN', 'ADMINISTRATOR', 'SALES_MANAGER', 'SELLER', 'FINANCE', 'AUDITOR')),
  legacy_annie_principal_id uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked', 'historical')),
  evidence_ref text NOT NULL CHECK (length(btrim(evidence_ref)) > 0),
  approved_by uuid REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'active' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)),
  CHECK ((status = 'historical' AND user_id IS NULL AND auth_id IS NULL
      AND legacy_annie_principal_id IS NOT NULL)
    OR (status <> 'historical' AND user_id IS NOT NULL AND auth_id IS NOT NULL)),
  FOREIGN KEY (user_id, auth_id) REFERENCES public.usuarios(id, auth_id) ON DELETE RESTRICT,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, user_id),
  UNIQUE (organization_id, auth_id),
  UNIQUE (organization_id, legacy_annie_principal_id)
);
CREATE INDEX sales_members_auth_active_idx ON public.sales_members (auth_id, status, organization_id);

CREATE TABLE public.sales_team_members (
  organization_id uuid NOT NULL,
  team_id uuid NOT NULL,
  member_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, team_id, member_id),
  FOREIGN KEY (organization_id, team_id) REFERENCES public.sales_teams(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, member_id) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT
);
CREATE INDEX sales_team_members_member_idx ON public.sales_team_members (organization_id, member_id);

CREATE TABLE public.sales_record_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  member_id uuid NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('lead', 'contact', 'account', 'opportunity')),
  record_id uuid NOT NULL,
  can_write boolean NOT NULL DEFAULT false,
  granted_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  FOREIGN KEY (organization_id, member_id) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, granted_by) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX sales_record_grants_active_unique ON public.sales_record_grants
  (organization_id, member_id, entity_type, record_id) WHERE revoked_at IS NULL;

CREATE TABLE public.sales_pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.sales_organizations(id) ON DELETE RESTRICT,
  code text NOT NULL CHECK (length(btrim(code)) > 0),
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  legacy_annie_id uuid,
  active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, code),
  UNIQUE (organization_id, legacy_annie_id)
);

CREATE TABLE public.sales_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  pipeline_id uuid NOT NULL,
  code text NOT NULL CHECK (length(btrim(code)) > 0),
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  position integer NOT NULL CHECK (position >= 0),
  probability integer NOT NULL CHECK (probability BETWEEN 0 AND 100),
  outcome text NOT NULL CHECK (outcome IN ('OPEN', 'WON', 'LOST')),
  legacy_annie_id uuid,
  FOREIGN KEY (organization_id, pipeline_id) REFERENCES public.sales_pipelines(organization_id, id) ON DELETE RESTRICT,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, pipeline_id, code),
  UNIQUE (organization_id, legacy_annie_id)
);
CREATE INDEX sales_stages_order_idx ON public.sales_stages (organization_id, pipeline_id, position);

CREATE TABLE public.sales_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.sales_organizations(id) ON DELETE RESTRICT,
  owner_member_id uuid NOT NULL,
  team_id uuid,
  legacy_annie_id uuid,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  display_name text NOT NULL CHECK (length(btrim(display_name)) BETWEEN 1 AND 500),
  first_name text,
  last_name text,
  company_name text,
  title text,
  email text,
  phone text,
  website text,
  industry text,
  address jsonb,
  description text,
  do_not_call boolean NOT NULL DEFAULT false,
  do_not_email boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'NEW' CHECK (status IN
    ('NEW','ASSIGNED','ATTEMPTING_CONTACT','CONTACTED','QUALIFIED','FOLLOW_UP',
     'UNRESPONSIVE','NOT_INTERESTED','PROPOSAL','PAYMENT_PENDING','WON','LOST','CONVERTED')),
  source text NOT NULL CHECK (length(btrim(source)) > 0),
  source_detail text,
  date_of_birth date,
  insurance text,
  corazon_salud boolean,
  plan text,
  product text,
  next_action text,
  next_follow_up_at timestamptz,
  converted_at timestamptz,
  archived_at timestamptz,
  created_by uuid NOT NULL,
  updated_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, owner_member_id) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, team_id) REFERENCES public.sales_teams(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, created_by) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, updated_by) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, legacy_annie_id)
);
CREATE INDEX sales_leads_scope_idx ON public.sales_leads (organization_id, owner_member_id, created_at DESC, id);
CREATE INDEX sales_leads_team_idx ON public.sales_leads (organization_id, team_id, created_at DESC);
CREATE INDEX sales_leads_stage_idx ON public.sales_leads (organization_id, status, created_at DESC);
CREATE INDEX sales_leads_email_idx ON public.sales_leads (organization_id, lower(email)) WHERE email IS NOT NULL;

CREATE TABLE public.sales_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.sales_organizations(id) ON DELETE RESTRICT,
  owner_member_id uuid NOT NULL,
  team_id uuid,
  legacy_annie_id uuid,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  display_name text NOT NULL CHECK (length(btrim(display_name)) BETWEEN 1 AND 500),
  first_name text,
  last_name text,
  title text,
  email text,
  phone text,
  address jsonb,
  description text,
  do_not_call boolean NOT NULL DEFAULT false,
  do_not_email boolean NOT NULL DEFAULT false,
  date_of_birth date,
  insurance text,
  corazon_salud boolean,
  plan text,
  product text,
  next_action text,
  next_follow_up_at timestamptz,
  archived_at timestamptz,
  created_by uuid NOT NULL,
  updated_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, owner_member_id) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, team_id) REFERENCES public.sales_teams(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, created_by) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, updated_by) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, legacy_annie_id)
);
CREATE INDEX sales_contacts_scope_idx ON public.sales_contacts (organization_id, owner_member_id, created_at DESC, id);
CREATE INDEX sales_contacts_email_idx ON public.sales_contacts (organization_id, lower(email)) WHERE email IS NOT NULL;

CREATE TABLE public.sales_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.sales_organizations(id) ON DELETE RESTRICT,
  owner_member_id uuid NOT NULL,
  team_id uuid,
  legacy_annie_id uuid,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 500),
  trade_name text,
  website text,
  industry text,
  phone text,
  email text,
  billing_address jsonb,
  shipping_address jsonb,
  description text,
  type text NOT NULL DEFAULT 'prospect' CHECK (type IN ('prospect','customer','partner')),
  next_follow_up_at timestamptz,
  archived_at timestamptz,
  created_by uuid NOT NULL,
  updated_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, owner_member_id) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, team_id) REFERENCES public.sales_teams(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, created_by) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, updated_by) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, legacy_annie_id)
);
CREATE INDEX sales_accounts_scope_idx ON public.sales_accounts (organization_id, owner_member_id, created_at DESC, id);

ALTER TABLE public.sales_contacts ADD COLUMN primary_account_id uuid;
ALTER TABLE public.sales_contacts ADD CONSTRAINT sales_contacts_primary_account_fk
  FOREIGN KEY (organization_id, primary_account_id) REFERENCES public.sales_accounts(organization_id, id) ON DELETE RESTRICT;

CREATE TABLE public.sales_account_contacts (
  organization_id uuid NOT NULL,
  account_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  role text,
  is_primary boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  legacy_annie_id uuid,
  PRIMARY KEY (organization_id, account_id, contact_id),
  FOREIGN KEY (organization_id, account_id) REFERENCES public.sales_accounts(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, contact_id) REFERENCES public.sales_contacts(organization_id, id) ON DELETE RESTRICT,
  UNIQUE (organization_id, legacy_annie_id)
);

CREATE TABLE public.sales_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.sales_organizations(id) ON DELETE RESTRICT,
  owner_member_id uuid NOT NULL,
  team_id uuid,
  legacy_annie_id uuid,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 500),
  account_id uuid NOT NULL,
  primary_contact_id uuid,
  stage_id uuid NOT NULL,
  probability integer NOT NULL DEFAULT 10 CHECK (probability BETWEEN 0 AND 100),
  currency varchar(3) NOT NULL,
  amount numeric(18,2),
  expected_close_date date NOT NULL,
  actual_close_date date,
  lost_reason text,
  description text,
  source text,
  product text,
  next_follow_up_at timestamptz,
  archived_at timestamptz,
  created_by uuid NOT NULL,
  updated_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, owner_member_id) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, team_id) REFERENCES public.sales_teams(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, account_id) REFERENCES public.sales_accounts(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, primary_contact_id) REFERENCES public.sales_contacts(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, stage_id) REFERENCES public.sales_stages(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, created_by) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, updated_by) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, legacy_annie_id)
);
CREATE INDEX sales_opportunities_scope_idx ON public.sales_opportunities (organization_id, owner_member_id, created_at DESC, id);
CREATE INDEX sales_opportunities_stage_idx ON public.sales_opportunities (organization_id, stage_id, created_at DESC);

ALTER TABLE public.sales_leads
  ADD COLUMN converted_account_id uuid,
  ADD COLUMN converted_contact_id uuid,
  ADD COLUMN converted_opportunity_id uuid;
ALTER TABLE public.sales_leads
  ADD CONSTRAINT sales_leads_converted_account_fk FOREIGN KEY (organization_id, converted_account_id)
    REFERENCES public.sales_accounts(organization_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT sales_leads_converted_contact_fk FOREIGN KEY (organization_id, converted_contact_id)
    REFERENCES public.sales_contacts(organization_id, id) ON DELETE RESTRICT,
  ADD CONSTRAINT sales_leads_converted_opportunity_fk FOREIGN KEY (organization_id, converted_opportunity_id)
    REFERENCES public.sales_opportunities(organization_id, id) ON DELETE RESTRICT;

CREATE TABLE public.sales_opportunity_contacts (
  organization_id uuid NOT NULL,
  opportunity_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  role text,
  legacy_annie_id uuid,
  PRIMARY KEY (organization_id, opportunity_id, contact_id),
  FOREIGN KEY (organization_id, opportunity_id) REFERENCES public.sales_opportunities(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, contact_id) REFERENCES public.sales_contacts(organization_id, id) ON DELETE RESTRICT,
  UNIQUE (organization_id, legacy_annie_id)
);

CREATE TABLE public.sales_lead_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  lead_id uuid NOT NULL,
  account_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  opportunity_id uuid,
  idempotency_key text NOT NULL,
  payload_hash text NOT NULL,
  legacy_annie_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, lead_id) REFERENCES public.sales_leads(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, account_id) REFERENCES public.sales_accounts(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, contact_id) REFERENCES public.sales_contacts(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, opportunity_id) REFERENCES public.sales_opportunities(organization_id, id) ON DELETE RESTRICT,
  UNIQUE (organization_id, lead_id),
  UNIQUE (organization_id, idempotency_key),
  UNIQUE (organization_id, legacy_annie_id)
);

CREATE TABLE public.sales_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.sales_organizations(id) ON DELETE RESTRICT,
  entity_type text NOT NULL,
  record_id uuid NOT NULL,
  actor_member_id uuid,
  action text NOT NULL,
  request_id uuid NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  legacy_annie_id uuid,
  FOREIGN KEY (organization_id, actor_member_id) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  UNIQUE (organization_id, legacy_annie_id)
);
CREATE INDEX sales_history_entity_idx ON public.sales_history (organization_id, entity_type, record_id, occurred_at DESC, id);

-- All native Sales tables are server-only until role/tenant policies are proven.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'sales_organizations','sales_teams','sales_members','sales_team_members',
    'sales_record_grants','sales_pipelines','sales_stages','sales_leads',
    'sales_contacts','sales_accounts','sales_account_contacts',
    'sales_opportunities','sales_opportunity_contacts',
    'sales_lead_conversions','sales_history'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated, service_role', table_name);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', table_name);
  END LOOP;
END $$;
