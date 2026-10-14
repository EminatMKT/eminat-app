-- Explicit, reviewed ANNIE identity links. No commercial rows or guessed matches.
CREATE TABLE public.annie_sales_tenant_mappings (
  empresa_codigo text PRIMARY KEY REFERENCES public.empresas(codigo) ON UPDATE RESTRICT ON DELETE RESTRICT,
  annie_organization_id uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  evidence_ref text NOT NULL CHECK (length(btrim(evidence_ref)) > 0),
  approved_by uuid REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'active' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)),
  UNIQUE (empresa_codigo, annie_organization_id)
);

CREATE TABLE public.annie_sales_user_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lilly_usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  supabase_auth_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  empresa_codigo text NOT NULL,
  annie_organization_id uuid NOT NULL,
  annie_principal_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  evidence_ref text NOT NULL CHECK (length(btrim(evidence_ref)) > 0),
  approved_by uuid REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (empresa_codigo, annie_organization_id)
    REFERENCES public.annie_sales_tenant_mappings(empresa_codigo, annie_organization_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (status <> 'active' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)),
  UNIQUE (lilly_usuario_id, annie_organization_id),
  UNIQUE (annie_principal_id, annie_organization_id)
);
CREATE INDEX annie_sales_user_auth_lookup
  ON public.annie_sales_user_mappings (supabase_auth_id, empresa_codigo, status);

CREATE TRIGGER annie_sales_tenant_updated_at BEFORE UPDATE ON public.annie_sales_tenant_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER annie_sales_user_updated_at BEFORE UPDATE ON public.annie_sales_user_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.annie_sales_tenant_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annie_sales_user_mappings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.annie_sales_tenant_mappings FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.annie_sales_user_mappings FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.annie_sales_tenant_mappings TO service_role;
GRANT SELECT ON public.annie_sales_user_mappings TO service_role;
