-- Owner-approved controlled Seller for STRATIX Native Sales. No ANNIE data
-- import or ANNIE principal mapping is required for native LILLY access.
-- Exact LILLY/Auth UUIDs, current role, active company affiliation, and
-- profile email are checked. Email alone never grants access; the Sales auth
-- foreign key validates the exact login UUID.
DO $bootstrap$
DECLARE
  candidate record;
  sales_org record;
  sales_member record;
BEGIN
  SELECT u.id, u.auth_id, u.nombre_display, e.codigo, e.nombre
  INTO STRICT candidate
  FROM public.usuarios u
  JOIN public.empresas e ON e.id=u.empresa_id
  WHERE u.id='fc17db75-4d79-4130-9267-34187bf03c4a'::uuid
    AND u.auth_id='9d160306-7884-4b1c-9c6c-6402a15b6590'::uuid
    AND lower(u.email)='marketing@eminat.net'
    AND u.rol='stratix360' AND u.activo=true
    AND e.codigo='STRATIX' AND e.activo=true;

  INSERT INTO public.sales_organizations
    (code,name,status,approved_by,approved_at)
  VALUES (lower(candidate.codigo),candidate.nombre,'active',
    '2344e112-76ef-42a8-ac56-7c488084e0f5'::uuid,now())
  ON CONFLICT (code) DO NOTHING;
  SELECT id,code,name,status INTO STRICT sales_org
  FROM public.sales_organizations WHERE code=lower(candidate.codigo);
  IF sales_org.status<>'active' OR sales_org.name<>candidate.nombre THEN
    RAISE EXCEPTION 'NATIVE_SALES_ORGANIZATION_CONFLICT';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.sales_members
    WHERE (user_id=candidate.id OR auth_id=candidate.auth_id)
      AND organization_id<>sales_org.id AND status='active'
  ) THEN
    RAISE EXCEPTION 'NATIVE_SELLER_OTHER_ORGANIZATION_CONFLICT';
  END IF;

  INSERT INTO public.sales_members
    (organization_id,user_id,auth_id,display_name,role,status,
     evidence_ref,approved_by,approved_at)
  VALUES (sales_org.id,candidate.id,candidate.auth_id,candidate.nombre_display,
    'SELLER','active','owner-approved-controlled-seller-2026-10-19',
    '2344e112-76ef-42a8-ac56-7c488084e0f5'::uuid,now())
  ON CONFLICT DO NOTHING;
  SELECT id,user_id,auth_id,role,status INTO STRICT sales_member
  FROM public.sales_members
  WHERE organization_id=sales_org.id AND user_id=candidate.id;
  IF sales_member.auth_id<>candidate.auth_id
     OR sales_member.role<>'SELLER' OR sales_member.status<>'active' THEN
    RAISE EXCEPTION 'NATIVE_SELLER_MEMBERSHIP_CONFLICT';
  END IF;
END;
$bootstrap$;
