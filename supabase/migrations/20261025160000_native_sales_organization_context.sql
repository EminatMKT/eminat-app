-- Organization context does not grant global SUPERADMIN access.
-- Preserve the exact approved Patient Portal fallback identity when its existing
-- membership is activated separately. Only the pending/active status guard changes.
CREATE OR REPLACE FUNCTION public.native_sales_patient_claim_contact(
  p_auth_id uuid, p_email text, p_first_name text, p_last_name text,
  p_phone text, p_organization_id uuid, p_owner_member_id uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_existing uuid; v_contact uuid; v_email text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'PATIENT_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  v_email:=lower(btrim(p_email));
  IF p_auth_id IS NULL OR p_organization_id IS NULL OR p_owner_member_id IS NULL OR
     p_first_name IS NULL OR p_last_name IS NULL OR v_email IS NULL OR
     v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR
     length(v_email)>320 OR length(btrim(p_first_name)) NOT BETWEEN 1 AND 160 OR
     length(btrim(p_last_name)) NOT BETWEEN 1 AND 160 OR
     (p_phone IS NOT NULL AND length(btrim(p_phone))>40) THEN
    RAISE EXCEPTION 'PATIENT_PROFILE_INVALID';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id=p_auth_id
      AND lower(email)=v_email AND email_confirmed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'PATIENT_AUTH_IDENTITY_UNVERIFIED' USING ERRCODE='42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_organization_id::text||':'||v_email,0));
  SELECT contact_id INTO v_existing FROM public.sales_patient_identities WHERE auth_id=p_auth_id;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;
  IF p_organization_id<>'9efab353-46a0-43d1-9901-e3f185dc5d30' OR
     p_owner_member_id<>'c67e9779-9e87-48b0-9f6c-bf6a0c8cebad' OR
     NOT EXISTS (SELECT 1 FROM public.sales_members WHERE id=p_owner_member_id
       AND organization_id=p_organization_id AND status IN ('pending','active') AND role='SUPERADMIN'
       AND user_id='2344e112-76ef-42a8-ac56-7c488084e0f5'
       AND evidence_ref='owner-approved-emc-patient-fallback-2026-10-20') OR
     NOT EXISTS (SELECT 1 FROM public.sales_organizations
       WHERE id=p_organization_id AND status='active') THEN
    RAISE EXCEPTION 'PATIENT_ORGANIZATION_UNAVAILABLE';
  END IF;
  IF EXISTS (SELECT 1 FROM public.sales_contacts WHERE lower(btrim(email))=v_email) THEN
    RAISE EXCEPTION 'PATIENT_CONTACT_REVIEW_REQUIRED';
  END IF;
  INSERT INTO public.sales_contacts
    (organization_id,owner_member_id,display_name,first_name,last_name,
     email,phone,corazon_salud,source,created_by,updated_by)
  VALUES (p_organization_id,p_owner_member_id,
    btrim(p_first_name)||' '||btrim(p_last_name),btrim(p_first_name),btrim(p_last_name),
    v_email,nullif(btrim(p_phone),''),true,'PATIENT_PORTAL',
    p_owner_member_id,p_owner_member_id) RETURNING id INTO v_contact;
  INSERT INTO public.sales_patient_identities
    (organization_id,auth_id,contact_id,source,approved_evidence)
  VALUES (p_organization_id,p_auth_id,v_contact,'SELF_REGISTRATION',
    'verified Supabase Auth session; self-submitted profile');
  INSERT INTO public.sales_history
    (organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
  VALUES (p_organization_id,'contact',v_contact,p_owner_member_id,
    'patient_self_registered',gen_random_uuid(),
    jsonb_build_object('identitySource','SELF_REGISTRATION'));
  RETURN v_contact;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_patient_claim_contact(uuid,text,text,text,text,uuid,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_claim_contact(uuid,text,text,text,text,uuid,uuid)
  TO service_role;

-- Same controlled-binding pattern as the original STRATIX approval. This RPC
-- cannot provision a user, insert a membership, choose a role, or activate anyone
-- else. Defining it does not activate access; apply is a separate approved step
-- after the organization-selector runtime is live.
CREATE FUNCTION public.native_sales_controlled_emc_admin(p_action text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_member public.sales_members%ROWTYPE;
BEGIN
  IF p_action IS NULL OR p_action NOT IN ('check','apply','verify') THEN
    RAISE EXCEPTION 'EMC_ADMIN_ACTION_INVALID' USING ERRCODE='22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.usuarios u JOIN auth.users a ON a.id=u.auth_id
    WHERE u.id='2344e112-76ef-42a8-ac56-7c488084e0f5'
      AND u.auth_id='3b1d0b87-083e-46ef-b7e1-1cd662360085'
      AND lower(u.email)='freddy@eminat.net' AND lower(a.email)=lower(u.email)
      AND u.rol='admin' AND u.activo AND a.email_confirmed_at IS NOT NULL) OR
    NOT EXISTS (SELECT 1 FROM public.sales_organizations
      WHERE id='9efab353-46a0-43d1-9901-e3f185dc5d30'
        AND code='emc' AND status='active') OR
    NOT EXISTS (SELECT 1 FROM public.sales_members m
      JOIN public.sales_organizations o ON o.id=m.organization_id
      WHERE m.user_id='2344e112-76ef-42a8-ac56-7c488084e0f5'
        AND m.auth_id='3b1d0b87-083e-46ef-b7e1-1cd662360085'
        AND m.role='SUPERADMIN' AND m.status='active' AND o.code='stratix'
        AND o.status='active' AND m.evidence_ref='owner-approved-freddy-stratix-2026-10-19') THEN
    RAISE EXCEPTION 'EMC_ADMIN_APPROVAL_IDENTITY_MISMATCH' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_member FROM public.sales_members
    WHERE id='c67e9779-9e87-48b0-9f6c-bf6a0c8cebad' FOR UPDATE;
  IF NOT FOUND OR v_member.organization_id<>'9efab353-46a0-43d1-9901-e3f185dc5d30'
    OR v_member.user_id IS DISTINCT FROM '2344e112-76ef-42a8-ac56-7c488084e0f5'::uuid
    OR v_member.auth_id IS DISTINCT FROM '3b1d0b87-083e-46ef-b7e1-1cd662360085'::uuid
    OR v_member.role<>'SUPERADMIN' OR v_member.status NOT IN ('pending','active')
    OR v_member.evidence_ref IS DISTINCT FROM 'owner-approved-emc-patient-fallback-2026-10-20'
    OR v_member.approved_by IS DISTINCT FROM '2344e112-76ef-42a8-ac56-7c488084e0f5'::uuid THEN
    RAISE EXCEPTION 'EMC_ADMIN_MEMBERSHIP_MISMATCH' USING ERRCODE='42501';
  END IF;
  IF p_action='apply' AND v_member.status='pending' THEN
    UPDATE public.sales_members SET status='active',approved_at=now(),updated_at=now()
      WHERE id=v_member.id;
    INSERT INTO public.sales_history
      (organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
    VALUES (v_member.organization_id,'sales_member',v_member.id,v_member.id,
      'emc_superadmin_access_activated',gen_random_uuid(),
      jsonb_build_object('previousStatus','pending','status','active','role','SUPERADMIN',
        'approval','owner-approved-emc-superadmin-access-2026-10-25',
        'fallbackEvidencePreserved',true));
  END IF;
  IF p_action='verify' AND v_member.status<>'active' THEN
    RAISE EXCEPTION 'EMC_ADMIN_NOT_ACTIVE';
  END IF;
  RETURN 'EMC_ADMIN_'||upper(p_action)||'_PASS';
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_controlled_emc_admin(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_controlled_emc_admin(text) TO service_role;
