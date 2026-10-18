-- Provider-neutral Social persistence. No live connection or secrets are seeded.
CREATE TABLE public.sales_social_providers (
  code text PRIMARY KEY CHECK (code ~ '^[A-Z][A-Z0-9_]{1,39}$'),
  display_name text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.sales_social_providers (code, display_name, enabled)
  VALUES ('META', 'Meta', false);

CREATE TABLE public.sales_social_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.sales_organizations(id) ON DELETE RESTRICT,
  provider_code text NOT NULL REFERENCES public.sales_social_providers(code) ON DELETE RESTRICT,
  external_business_id text,
  external_business_name text,
  app_id text,
  status text NOT NULL DEFAULT 'DISCONNECTED' CHECK (status IN ('DISCONNECTED','PENDING','CONNECTED','DEGRADED','REVOKED')),
  granted_permissions jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(granted_permissions) = 'array'),
  token_ciphertext text,
  token_expires_at timestamptz,
  last_refresh_at timestamptz,
  last_error_code text,
  connected_at timestamptz,
  revoked_at timestamptz,
  created_by uuid NOT NULL,
  updated_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  legacy_annie_id uuid,
  FOREIGN KEY (organization_id, created_by) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, updated_by) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, legacy_annie_id)
);
CREATE INDEX sales_social_integrations_status_idx ON public.sales_social_integrations (organization_id, provider_code, status);

CREATE TABLE public.sales_social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  integration_id uuid NOT NULL,
  external_account_id text NOT NULL,
  display_name text,
  account_type text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','DISABLED','REVOKED')),
  discovered_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, integration_id) REFERENCES public.sales_social_integrations(organization_id, id) ON DELETE RESTRICT,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, integration_id, external_account_id)
);

CREATE TABLE public.sales_social_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  account_id uuid NOT NULL,
  external_asset_id text NOT NULL,
  asset_type text NOT NULL,
  display_name text,
  status text NOT NULL DEFAULT 'DISABLED' CHECK (status IN ('DISABLED','READY','SUBSCRIBED','ERROR')),
  webhook_status text NOT NULL DEFAULT 'NOT_SUBSCRIBED',
  default_owner_member_id uuid NOT NULL,
  default_team_id uuid,
  token_ciphertext text,
  token_expires_at timestamptz,
  last_event_at timestamptz,
  last_error_code text,
  legacy_annie_id uuid,
  FOREIGN KEY (organization_id, account_id) REFERENCES public.sales_social_accounts(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, default_owner_member_id) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, default_team_id) REFERENCES public.sales_teams(organization_id, id) ON DELETE RESTRICT,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, account_id, external_asset_id),
  UNIQUE (organization_id, legacy_annie_id)
);

CREATE TABLE public.sales_social_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  asset_id uuid NOT NULL,
  external_subject_id text NOT NULL,
  channel text NOT NULL,
  kind text NOT NULL,
  last_event_at timestamptz NOT NULL,
  last_text text,
  unread boolean NOT NULL DEFAULT true,
  owner_member_id uuid,
  local_entity_type text,
  local_entity_id uuid,
  legacy_annie_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, asset_id) REFERENCES public.sales_social_assets(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, owner_member_id) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, asset_id, external_subject_id, channel, kind),
  UNIQUE (organization_id, legacy_annie_id)
);
CREATE INDEX sales_social_conversations_recent_idx ON public.sales_social_conversations (organization_id, last_event_at DESC);

CREATE TABLE public.sales_social_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  conversation_id uuid NOT NULL,
  external_message_id text,
  direction text NOT NULL CHECK (direction IN ('INBOUND','OUTBOUND')),
  text_content text,
  status text NOT NULL DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED','PENDING','SENT','FAILED')),
  actor_member_id uuid,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, conversation_id) REFERENCES public.sales_social_conversations(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, actor_member_id) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, conversation_id, external_message_id)
);

CREATE TABLE public.sales_social_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  asset_id uuid NOT NULL,
  external_comment_id text NOT NULL,
  external_parent_id text,
  external_post_id text,
  direction text NOT NULL CHECK (direction IN ('INBOUND','OUTBOUND')),
  text_content text,
  status text NOT NULL DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED','PENDING','SENT','FAILED')),
  actor_member_id uuid,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, asset_id) REFERENCES public.sales_social_assets(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, actor_member_id) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, asset_id, external_comment_id)
);

CREATE TABLE public.sales_social_webhook_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  asset_id uuid NOT NULL,
  external_event_id text NOT NULL,
  event_kind text NOT NULL,
  object_type text NOT NULL,
  payload_hash text NOT NULL,
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSED','RETRY','FAILED')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts integer NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 20),
  next_retry_at timestamptz,
  correlation_id uuid NOT NULL,
  operation_id uuid NOT NULL,
  error_code text,
  normalized jsonb NOT NULL,
  processed_at timestamptz,
  FOREIGN KEY (organization_id, asset_id) REFERENCES public.sales_social_assets(organization_id, id) ON DELETE RESTRICT,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, asset_id, external_event_id),
  UNIQUE (organization_id, correlation_id),
  UNIQUE (organization_id, operation_id)
);
CREATE INDEX sales_social_receipts_retry_idx ON public.sales_social_webhook_receipts (status, next_retry_at);

CREATE TABLE public.sales_social_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  asset_id uuid NOT NULL,
  receipt_id uuid NOT NULL,
  external_lead_id text NOT NULL,
  fingerprint_hash text NOT NULL,
  lead_id uuid NOT NULL,
  campaign_id text,
  adset_id text,
  ad_id text,
  form_id text,
  page_id text,
  operation_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'CREATED',
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, asset_id) REFERENCES public.sales_social_assets(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, receipt_id) REFERENCES public.sales_social_webhook_receipts(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, lead_id) REFERENCES public.sales_leads(organization_id, id) ON DELETE RESTRICT,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, asset_id, external_lead_id),
  UNIQUE (organization_id, receipt_id),
  UNIQUE (organization_id, operation_id)
);
CREATE INDEX sales_social_leads_fingerprint_idx ON public.sales_social_leads (organization_id, fingerprint_hash);

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'sales_social_providers','sales_social_integrations','sales_social_accounts',
    'sales_social_assets','sales_social_conversations','sales_social_messages',
    'sales_social_comments','sales_social_webhook_receipts','sales_social_leads'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated, service_role', table_name);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', table_name);
  END LOOP;
END $$;
