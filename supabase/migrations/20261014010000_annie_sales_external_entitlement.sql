-- An external Sales entitlement is independent of a user's primary LILLY company.
-- Existing company-to-tenant mappings remain available for later reviewed links.
ALTER TABLE public.annie_sales_user_mappings
  ALTER COLUMN empresa_codigo DROP NOT NULL;

ALTER TABLE public.annie_sales_user_mappings
  ADD COLUMN access_kind text NOT NULL DEFAULT 'company_tenant'
    CHECK (access_kind IN ('company_tenant', 'external_sales_entitlement'));

ALTER TABLE public.annie_sales_user_mappings
  ADD CONSTRAINT annie_sales_user_mapping_access_kind_check
  CHECK (
    (access_kind = 'company_tenant' AND empresa_codigo IS NOT NULL)
    OR (access_kind = 'external_sales_entitlement' AND empresa_codigo IS NULL)
  );

CREATE INDEX annie_sales_user_entitlement_lookup
  ON public.annie_sales_user_mappings (lilly_usuario_id, supabase_auth_id, status);
