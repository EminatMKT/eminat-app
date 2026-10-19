-- Owner-approved, exact LILLY identity binding for STRATIX Native Sales.
-- The UUID pair, existing admin role, active Supabase login, and company are
-- all mandatory. Email is a secondary check, never the binding authority.
-- Apply only after the Native Sales schema exists via the protected workflow.
DO $bootstrap$
DECLARE
  candidate record;
  sales_org record;
  sales_member record;
BEGIN
  SELECT u.id, u.auth_id, u.nombre_display, e.codigo, e.nombre
  INTO STRICT candidate
  FROM public.usuarios u
  JOIN auth.users a ON a.id=u.auth_id
  CROSS JOIN public.empresas e
  WHERE u.id='2344e112-76ef-42a8-ac56-7c488084e0f5'::uuid
    AND u.auth_id='3b1d0b87-083e-46ef-b7e1-1cd662360085'::uuid
    AND lower(u.email)='freddy@eminat.net'
    AND lower(a.email)='freddy@eminat.net'
    AND u.rol='admin' AND u.activo=true
    AND e.codigo='STRATIX' AND e.activo=true;

  INSERT INTO public.sales_organizations
    (code,name,status,approved_by,approved_at)
  VALUES (lower(candidate.codigo),candidate.nombre,'active',candidate.id,now())
  ON CONFLICT (code) DO NOTHING;
  SELECT id,code,name,status INTO STRICT sales_org
  FROM public.sales_organizations WHERE code=lower(candidate.codigo);
  IF sales_org.name<>candidate.nombre OR sales_org.status<>'active' THEN
    RAISE EXCEPTION 'NATIVE_SALES_ORGANIZATION_CONFLICT';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.sales_members
    WHERE (user_id=candidate.id OR auth_id=candidate.auth_id)
      AND organization_id<>sales_org.id AND status='active'
  ) THEN
    RAISE EXCEPTION 'NATIVE_SALES_ADMIN_OTHER_ORGANIZATION_CONFLICT';
  END IF;

  INSERT INTO public.sales_members
    (organization_id,user_id,auth_id,display_name,role,status,
     evidence_ref,approved_by,approved_at)
  VALUES (sales_org.id,candidate.id,candidate.auth_id,candidate.nombre_display,
    'SUPERADMIN','active','owner-approved-freddy-stratix-2026-10-19',candidate.id,now())
  ON CONFLICT DO NOTHING;
  SELECT id,user_id,auth_id,role,status INTO STRICT sales_member
  FROM public.sales_members
  WHERE organization_id=sales_org.id AND user_id=candidate.id;
  IF sales_member.auth_id<>candidate.auth_id
     OR sales_member.role<>'SUPERADMIN' OR sales_member.status<>'active' THEN
    RAISE EXCEPTION 'NATIVE_SALES_ADMIN_BINDING_CONFLICT';
  END IF;
END;
$bootstrap$;
