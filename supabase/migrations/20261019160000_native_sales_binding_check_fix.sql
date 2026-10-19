-- Replace the already-deployed binding function without touching any identity rows.
-- The original check referenced an unassigned record when no Sales member existed.
-- A nullable scalar records whether a member was found, including on first binding.
-- SECURITY DEFINER avoids a migration login with BYPASSRLS or broad grants.
CREATE OR REPLACE FUNCTION public.native_sales_controlled_binding(
  requested_binding text, action text
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  expected_user uuid;
  expected_auth uuid;
  expected_email text;
  expected_profile_role text;
  expected_sales_role text;
  expected_evidence text;
  candidate record;
  sales_org record;
  sales_member record;
  sales_member_id uuid := NULL;
BEGIN
  IF requested_binding = 'seller' THEN
    expected_user := 'fc17db75-4d79-4130-9267-34187bf03c4a';
    expected_auth := '9d160306-7884-4b1c-9c6c-6402a15b6590';
    expected_email := 'marketing@eminat.net';
    expected_profile_role := 'stratix360';
    expected_sales_role := 'SELLER';
    expected_evidence := 'owner-approved-controlled-seller-2026-10-19';
  ELSIF requested_binding = 'superadmin' THEN
    expected_user := '2344e112-76ef-42a8-ac56-7c488084e0f5';
    expected_auth := '3b1d0b87-083e-46ef-b7e1-1cd662360085';
    expected_email := 'freddy@eminat.net';
    expected_profile_role := 'admin';
    expected_sales_role := 'SUPERADMIN';
    expected_evidence := 'owner-approved-freddy-stratix-2026-10-19';
  ELSE
    RAISE EXCEPTION 'NATIVE_SALES_BINDING_NOT_APPROVED';
  END IF;
  IF action NOT IN ('check', 'apply', 'verify') OR action IS NULL THEN
    RAISE EXCEPTION 'NATIVE_SALES_BINDING_ACTION_INVALID';
  END IF;

  SELECT u.id, u.auth_id, u.nombre_display, e.codigo, e.nombre
    INTO STRICT candidate
  FROM public.usuarios u
  JOIN public.empresas e ON e.codigo = 'STRATIX' AND e.activo = true
  WHERE u.id = expected_user AND u.auth_id = expected_auth
    AND lower(u.email) = expected_email
    AND u.rol = expected_profile_role AND u.activo = true
    AND (requested_binding = 'superadmin' OR u.empresa_id = e.id);

  SELECT id, code, name, status INTO sales_org
  FROM public.sales_organizations WHERE code = lower(candidate.codigo);
  IF FOUND AND (sales_org.name <> candidate.nombre OR sales_org.status <> 'active') THEN
    RAISE EXCEPTION 'NATIVE_SALES_ORGANIZATION_CONFLICT';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.sales_members
    WHERE (user_id = candidate.id OR auth_id = candidate.auth_id)
      AND status = 'active'
      AND (sales_org.id IS NULL OR organization_id <> sales_org.id)
  ) THEN
    RAISE EXCEPTION 'NATIVE_SALES_OTHER_ORGANIZATION_CONFLICT';
  END IF;

  IF action = 'apply' THEN
    INSERT INTO public.sales_organizations
      (code, name, status, approved_by, approved_at)
    VALUES (lower(candidate.codigo), candidate.nombre, 'active',
      '2344e112-76ef-42a8-ac56-7c488084e0f5'::uuid, now())
    ON CONFLICT (code) DO NOTHING;
    SELECT id, code, name, status INTO STRICT sales_org
    FROM public.sales_organizations WHERE code = lower(candidate.codigo);
    IF sales_org.name <> candidate.nombre OR sales_org.status <> 'active' THEN
      RAISE EXCEPTION 'NATIVE_SALES_ORGANIZATION_CONFLICT';
    END IF;
    INSERT INTO public.sales_members
      (organization_id, user_id, auth_id, display_name, role, status,
       evidence_ref, approved_by, approved_at)
    VALUES (sales_org.id, candidate.id, candidate.auth_id,
      candidate.nombre_display, expected_sales_role, 'active',
      expected_evidence, '2344e112-76ef-42a8-ac56-7c488084e0f5'::uuid, now())
    ON CONFLICT DO NOTHING;
  END IF;

  IF sales_org.id IS NOT NULL THEN
    SELECT id, user_id, auth_id, role, status, evidence_ref INTO sales_member
    FROM public.sales_members
    WHERE organization_id = sales_org.id AND user_id = candidate.id;
    IF FOUND THEN
      sales_member_id := sales_member.id;
      IF sales_member.auth_id <> candidate.auth_id
         OR sales_member.role <> expected_sales_role
         OR sales_member.status <> 'active'
         OR sales_member.evidence_ref <> expected_evidence THEN
        RAISE EXCEPTION 'NATIVE_SALES_MEMBERSHIP_CONFLICT';
      END IF;
    END IF;
  END IF;
  IF action IN ('apply', 'verify') AND sales_member_id IS NULL THEN
    RAISE EXCEPTION 'NATIVE_SALES_MEMBERSHIP_MISSING';
  END IF;
  RETURN 'NATIVE_SALES_BINDING_' || upper(action) || '_PASS';
END;
$function$;

REVOKE ALL ON FUNCTION public.native_sales_controlled_binding(text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_controlled_binding(text, text)
  TO service_role;
