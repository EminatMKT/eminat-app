-- Owner-approved patient Sales scope. No existing user, contact or membership is
-- changed. Freddy is a pending administrative owner in EMC, so his existing
-- active Stratix Sales session remains the only active organization session.
DO $$
DECLARE
  v_organization uuid := '9efab353-46a0-43d1-9901-e3f185dc5d30';
  v_owner uuid := 'c67e9779-9e87-48b0-9f6c-bf6a0c8cebad';
  v_user uuid := '2344e112-76ef-42a8-ac56-7c488084e0f5';
  v_auth uuid := '3b1d0b87-083e-46ef-b7e1-1cd662360085';
  v_existing_org public.sales_organizations%ROWTYPE;
  v_existing_owner public.sales_members%ROWTYPE;
BEGIN
  -- Local/CI databases have no approved Production user or EMC affiliation.
  -- Leave their Sales organizations empty; Production is prechecked separately.
  IF NOT EXISTS (SELECT 1 FROM public.empresas
    WHERE codigo = 'EMC' AND nombre = 'Eminat Medical Center' AND activo = true) OR
     NOT EXISTS (SELECT 1 FROM public.usuarios
    WHERE id = v_user AND auth_id = v_auth AND lower(email) = 'freddy@eminat.net'
      AND rol = 'admin' AND activo = true) THEN
    IF EXISTS (SELECT 1 FROM public.sales_organizations
      WHERE code = 'emc' OR id = v_organization) OR
       EXISTS (SELECT 1 FROM public.sales_members WHERE id = v_owner) THEN
      RAISE EXCEPTION 'PATIENT_EMC_OWNER_PRECHECK_FAILED';
    END IF;
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sales_members
    WHERE organization_id = '00b69cc1-d6f1-4972-9fab-d6aa02d611d7'
      AND user_id = v_user AND auth_id = v_auth AND role = 'SUPERADMIN' AND status = 'active') THEN
    RAISE EXCEPTION 'PATIENT_EMC_OWNER_PRECHECK_FAILED';
  END IF;

  SELECT * INTO v_existing_org FROM public.sales_organizations WHERE code = 'emc';
  IF FOUND THEN
    IF v_existing_org.id <> v_organization OR v_existing_org.name <> 'Eminat Medical Center'
      OR v_existing_org.status <> 'active' THEN
      RAISE EXCEPTION 'PATIENT_EMC_ORGANIZATION_CONFLICT';
    END IF;
  ELSE
    INSERT INTO public.sales_organizations (id, code, name, status, approved_by, approved_at)
    VALUES (v_organization, 'emc', 'Eminat Medical Center', 'active', v_user, now());
  END IF;

  SELECT * INTO v_existing_owner FROM public.sales_members
    WHERE organization_id = v_organization AND (user_id = v_user OR auth_id = v_auth);
  IF (SELECT count(*) FROM public.sales_members
    WHERE organization_id = v_organization AND (user_id = v_user OR auth_id = v_auth)) > 1 THEN
    RAISE EXCEPTION 'PATIENT_EMC_OWNER_CONFLICT';
  END IF;
  IF FOUND THEN
    IF v_existing_owner.id <> v_owner OR v_existing_owner.user_id <> v_user OR
      v_existing_owner.auth_id <> v_auth OR v_existing_owner.role <> 'SUPERADMIN' OR
      v_existing_owner.status <> 'pending' OR
      v_existing_owner.evidence_ref <> 'owner-approved-emc-patient-fallback-2026-10-20' THEN
      RAISE EXCEPTION 'PATIENT_EMC_OWNER_CONFLICT';
    END IF;
  ELSE
    INSERT INTO public.sales_members
      (id, organization_id, user_id, auth_id, display_name, role, status,
       evidence_ref, approved_by, approved_at)
    SELECT v_owner, v_organization, v_user, v_auth, nombre_display,
      'SUPERADMIN', 'pending', 'owner-approved-emc-patient-fallback-2026-10-20',
      v_user, now()
    FROM public.usuarios WHERE id = v_user;
  END IF;
END $$;
