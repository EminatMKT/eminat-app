-- One-time controlled Seller binding. This is not an ANNIE commercial import.
-- Run only after Native Sales schema apply, under protected Production approval.
-- The email is an additional identity check; the existing active, approved
-- LILLY/Auth/tenant mapping is the authority. No email-only access grant.
DO $bootstrap$
DECLARE
  candidate record;
  candidate_count integer;
  sales_org record;
  sales_member record;
BEGIN
  SELECT count(*) INTO candidate_count
  FROM public.annie_sales_user_mappings m
  JOIN public.annie_sales_tenant_mappings t
    ON t.empresa_codigo=m.empresa_codigo
   AND t.annie_organization_id=m.annie_organization_id
  JOIN public.usuarios u ON u.id=m.lilly_usuario_id
    AND u.auth_id=m.supabase_auth_id AND u.activo=true
  JOIN auth.users a ON a.id=m.supabase_auth_id
  JOIN public.usuario_empresas_acceso x ON x.usuario_id=u.id
    AND x.empresa_codigo=m.empresa_codigo
  JOIN public.empresas e ON e.codigo=m.empresa_codigo AND e.activo=true
  WHERE m.status='active' AND t.status='active'
    AND lower(u.email)='marketing@eminat.net'
    AND lower(a.email)='marketing@eminat.net';
  IF candidate_count<>1 THEN
    RAISE EXCEPTION 'NATIVE_SELLER_APPROVED_BINDING_REQUIRED';
  END IF;

  SELECT m.lilly_usuario_id, m.supabase_auth_id, m.empresa_codigo,
    m.evidence_ref, m.approved_by, m.approved_at,
    t.approved_by AS tenant_approved_by, t.approved_at AS tenant_approved_at,
    e.nombre AS company_name, u.nombre_display AS display_name
  INTO STRICT candidate
  FROM public.annie_sales_user_mappings m
  JOIN public.annie_sales_tenant_mappings t
    ON t.empresa_codigo=m.empresa_codigo
   AND t.annie_organization_id=m.annie_organization_id
  JOIN public.usuarios u ON u.id=m.lilly_usuario_id
    AND u.auth_id=m.supabase_auth_id AND u.activo=true
  JOIN auth.users a ON a.id=m.supabase_auth_id
  JOIN public.usuario_empresas_acceso x ON x.usuario_id=u.id
    AND x.empresa_codigo=m.empresa_codigo
  JOIN public.empresas e ON e.codigo=m.empresa_codigo AND e.activo=true
  WHERE m.status='active' AND t.status='active'
    AND lower(u.email)='marketing@eminat.net'
    AND lower(a.email)='marketing@eminat.net';
  IF lower(candidate.empresa_codigo) !~ '^[a-z0-9][a-z0-9_-]{1,63}$'
     OR candidate.approved_by IS NULL OR candidate.approved_at IS NULL
     OR candidate.tenant_approved_by IS NULL OR candidate.tenant_approved_at IS NULL THEN
    RAISE EXCEPTION 'NATIVE_SELLER_APPROVAL_INVALID';
  END IF;

  INSERT INTO public.sales_organizations
    (code,name,status,approved_by,approved_at)
  VALUES (lower(candidate.empresa_codigo),candidate.company_name,'active',
    candidate.tenant_approved_by,candidate.tenant_approved_at)
  ON CONFLICT (code) DO NOTHING;
  SELECT id,code,name,status INTO STRICT sales_org
  FROM public.sales_organizations WHERE code=lower(candidate.empresa_codigo);
  IF sales_org.status<>'active' OR sales_org.name<>candidate.company_name THEN
    RAISE EXCEPTION 'NATIVE_SALES_ORGANIZATION_CONFLICT';
  END IF;

  INSERT INTO public.sales_members
    (organization_id,user_id,auth_id,display_name,role,status,
     evidence_ref,approved_by,approved_at)
  VALUES (sales_org.id,candidate.lilly_usuario_id,candidate.supabase_auth_id,
    candidate.display_name,'SELLER','active',candidate.evidence_ref,
    candidate.approved_by,candidate.approved_at)
  ON CONFLICT (organization_id,user_id) DO NOTHING;
  SELECT id,user_id,auth_id,role,status INTO STRICT sales_member
  FROM public.sales_members
  WHERE organization_id=sales_org.id AND user_id=candidate.lilly_usuario_id;
  IF sales_member.auth_id<>candidate.supabase_auth_id
     OR sales_member.role<>'SELLER' OR sales_member.status<>'active' THEN
    RAISE EXCEPTION 'NATIVE_SELLER_MEMBERSHIP_CONFLICT';
  END IF;
END;
$bootstrap$;
