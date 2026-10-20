-- Preserve historical ANNIE PDF bytes for controlled audit/reconciliation.
-- Patient-facing PDF routes continue to generate the current reduced-PII card.
INSERT INTO storage.buckets (id, name, public)
  VALUES ('sales-membership-archive', 'sales-membership-archive', false)
  ON CONFLICT (id) DO NOTHING;
CREATE POLICY sales_membership_archive_server_only ON storage.objects
  AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (bucket_id <> 'sales-membership-archive')
  WITH CHECK (bucket_id <> 'sales-membership-archive');

CREATE TABLE public.sales_membership_archive_documents (
  organization_id uuid NOT NULL,
  membership_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('membership','agreement')),
  object_key text NOT NULL CHECK (length(object_key) BETWEEN 1 AND 240),
  sha256 char(64) NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  byte_count bigint NOT NULL CHECK (byte_count BETWEEN 1 AND 10485760),
  imported_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, membership_id, kind),
  UNIQUE (object_key),
  FOREIGN KEY (organization_id, membership_id)
    REFERENCES public.sales_memberships(organization_id, id) ON DELETE RESTRICT
);
CREATE INDEX sales_membership_archive_membership_idx
  ON public.sales_membership_archive_documents (organization_id, membership_id);
ALTER TABLE public.sales_membership_archive_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sales_membership_archive_documents FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON public.sales_membership_archive_documents TO service_role;
