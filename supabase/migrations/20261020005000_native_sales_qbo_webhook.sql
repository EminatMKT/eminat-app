-- Isolated QuickBooks webhook persistence. No company connection, token,
-- financial row, or commercial record is created by this migration.
CREATE TABLE public.sales_qbo_connections (
  organization_id uuid NOT NULL REFERENCES public.sales_organizations(id) ON DELETE RESTRICT,
  environment text NOT NULL CHECK (environment IN ('sandbox','production')),
  realm_id text NOT NULL CHECK (realm_id ~ '^[0-9]{1,80}$'),
  home_currency varchar(3) NOT NULL CHECK (home_currency ~ '^[A-Z]{3}$'),
  status text NOT NULL DEFAULT 'DISCONNECTED' CHECK (status IN ('DISCONNECTED','CONNECTED','RECONNECT_REQUIRED')),
  access_token_ciphertext text,
  refresh_token_ciphertext text,
  access_expires_at timestamptz,
  refresh_expires_at timestamptz,
  connected_at timestamptz,
  last_reconciled_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, environment),
  UNIQUE (environment, realm_id),
  UNIQUE (organization_id, environment, realm_id),
  CHECK (status <> 'CONNECTED' OR
    (access_token_ciphertext IS NOT NULL AND refresh_token_ciphertext IS NOT NULL
      AND access_expires_at IS NOT NULL AND refresh_expires_at IS NOT NULL))
);

CREATE TABLE public.sales_qbo_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.sales_organizations(id) ON DELETE RESTRICT,
  environment text NOT NULL CHECK (environment IN ('sandbox','production')),
  realm_id text NOT NULL,
  event_fingerprint text NOT NULL CHECK (event_fingerprint ~ '^[a-f0-9]{64}$'),
  entity_type text NOT NULL CHECK (entity_type IN ('Customer','Item','Invoice','Payment')),
  entity_id text NOT NULL CHECK (entity_id ~ '^[0-9]{1,80}$'),
  operation text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSED','RETRY','IGNORED')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, environment, event_fingerprint),
  FOREIGN KEY (organization_id, environment, realm_id)
    REFERENCES public.sales_qbo_connections(organization_id, environment, realm_id) ON DELETE RESTRICT
);
CREATE INDEX sales_qbo_webhook_retry_idx ON public.sales_qbo_webhook_events
  (environment, status, next_attempt_at) WHERE status IN ('PENDING','RETRY');

ALTER TABLE public.sales_qbo_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_qbo_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sales_qbo_connections,public.sales_qbo_webhook_events FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.sales_qbo_connections,public.sales_qbo_webhook_events TO service_role;
