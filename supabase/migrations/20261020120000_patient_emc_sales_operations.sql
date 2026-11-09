-- EMC Patient Portal commercial workflow. Ivette and Lazaro remain unbound
-- until they have individually approved LILLY Auth identities.
-- No existing contact, lead, membership, or payment row is backfilled.

DO $$
DECLARE
  v_org uuid := '9efab353-46a0-43d1-9901-e3f185dc5d30';
  v_admin uuid := '2344e112-76ef-42a8-ac56-7c488084e0f5';
  v_team uuid;
  v_gigi uuid;
  v_gabriel uuid;
BEGIN
  -- Local/CI environments have no approved EMC organization or people.
  IF NOT EXISTS (SELECT 1 FROM public.sales_organizations WHERE id=v_org) THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sales_organizations
      WHERE id=v_org AND code='emc' AND name='Eminat Medical Center' AND status='active')
    OR NOT EXISTS (SELECT 1 FROM public.sales_members
      WHERE organization_id=v_org AND user_id=v_admin AND role='SUPERADMIN'
        AND status='pending' AND id='c67e9779-9e87-48b0-9f6c-bf6a0c8cebad')
    OR NOT EXISTS (SELECT 1 FROM public.usuarios
      WHERE id='23dd1362-5648-49ab-853d-e08d123a1e00' AND
        auth_id='23dd1362-5648-49ab-853d-e08d123a1e00' AND
        lower(email)='guisella@eminat.net' AND activo)
    OR NOT EXISTS (SELECT 1 FROM public.usuarios
      WHERE id='fc914ab6-822f-457b-b9c0-315e2a7074fc' AND
        auth_id='fc914ab6-822f-457b-b9c0-315e2a7074fc' AND
        lower(email)='gnegrete@eminat.net' AND activo) THEN
    RAISE EXCEPTION 'EMC_TEAM_PRECHECK_FAILED';
  END IF;
  SELECT id INTO v_team FROM public.sales_teams
    WHERE organization_id=v_org AND name='Corazón Salud Sales';
  IF v_team IS NULL THEN
    INSERT INTO public.sales_teams (organization_id,name)
    VALUES (v_org,'Corazón Salud Sales') RETURNING id INTO v_team;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sales_teams
      WHERE id=v_team AND organization_id=v_org AND active) THEN
    RAISE EXCEPTION 'EMC_TEAM_INACTIVE';
  END IF;
  INSERT INTO public.sales_members
    (organization_id,user_id,auth_id,display_name,role,status,evidence_ref,approved_by,approved_at)
  VALUES
    (v_org,'23dd1362-5648-49ab-853d-e08d123a1e00',
      '23dd1362-5648-49ab-853d-e08d123a1e00','Guiselle Negrete',
      'SELLER','active','owner-approved-emc-sales-2026-10-20',v_admin,now()),
    (v_org,'fc914ab6-822f-457b-b9c0-315e2a7074fc',
      'fc914ab6-822f-457b-b9c0-315e2a7074fc','Gabriel Negrete',
      'SELLER','active','owner-approved-emc-sales-2026-10-20',v_admin,now())
  ON CONFLICT (organization_id,user_id) DO NOTHING;
  SELECT id INTO v_gigi FROM public.sales_members
    WHERE organization_id=v_org AND user_id='23dd1362-5648-49ab-853d-e08d123a1e00'
      AND auth_id='23dd1362-5648-49ab-853d-e08d123a1e00'
      AND role='SELLER' AND status='active';
  SELECT id INTO v_gabriel FROM public.sales_members
    WHERE organization_id=v_org AND user_id='fc914ab6-822f-457b-b9c0-315e2a7074fc'
      AND auth_id='fc914ab6-822f-457b-b9c0-315e2a7074fc'
      AND role='SELLER' AND status='active';
  IF v_gigi IS NULL OR v_gabriel IS NULL THEN RAISE EXCEPTION 'EMC_SELLER_CONFLICT'; END IF;
  INSERT INTO public.sales_team_members (organization_id,team_id,member_id)
    VALUES (v_org,v_team,v_gigi),(v_org,v_team,v_gabriel)
    ON CONFLICT DO NOTHING;
  INSERT INTO public.sales_pipelines (organization_id,code,name)
    VALUES (v_org,'PATIENT_ENROLLMENT','Corazón Salud Enrollment')
    ON CONFLICT (organization_id,code) DO NOTHING;
  IF NOT EXISTS (SELECT 1 FROM public.sales_pipelines WHERE organization_id=v_org
      AND code='PATIENT_ENROLLMENT' AND name='Corazón Salud Enrollment' AND active) THEN
    RAISE EXCEPTION 'EMC_PIPELINE_CONFLICT';
  END IF;
  INSERT INTO public.sales_stages
    (organization_id,pipeline_id,code,name,position,probability,outcome)
  SELECT v_org,p.id,stage.code,stage.name,stage.position,stage.probability,stage.outcome
  FROM public.sales_pipelines p CROSS JOIN (VALUES
    ('PAYMENT_PENDING','Payment Pending',0,20,'OPEN'),
    ('WON','Paid',1,100,'WON'),
    ('LOST','Lost',2,0,'LOST')) AS stage(code,name,position,probability,outcome)
  WHERE p.organization_id=v_org AND p.code='PATIENT_ENROLLMENT'
  ON CONFLICT (organization_id,pipeline_id,code) DO NOTHING;
END;
$$;

CREATE TABLE public.sales_patient_assignment_order (
  organization_id uuid NOT NULL,
  member_id uuid NOT NULL,
  position smallint NOT NULL CHECK (position BETWEEN 1 AND 100),
  enabled boolean NOT NULL DEFAULT true,
  PRIMARY KEY (organization_id,member_id),
  UNIQUE (organization_id,position),
  FOREIGN KEY (organization_id,member_id)
    REFERENCES public.sales_members(organization_id,id) ON DELETE RESTRICT
);
CREATE TABLE public.sales_patient_assignment_state (
  organization_id uuid PRIMARY KEY REFERENCES public.sales_organizations(id) ON DELETE RESTRICT,
  last_position smallint NOT NULL DEFAULT 0 CHECK (last_position BETWEEN 0 AND 100)
);
ALTER TABLE public.sales_patient_assignment_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_patient_assignment_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sales_patient_assignment_order,public.sales_patient_assignment_state
  FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.sales_patient_assignment_order,
  public.sales_patient_assignment_state TO service_role;

INSERT INTO public.sales_patient_assignment_order (organization_id,member_id,position)
SELECT m.organization_id,m.id,
  CASE lower(u.email) WHEN 'guisella@eminat.net' THEN 1 ELSE 2 END
FROM public.sales_members m JOIN public.usuarios u ON u.id=m.user_id
WHERE m.organization_id='9efab353-46a0-43d1-9901-e3f185dc5d30'
  AND m.status='active' AND m.role='SELLER'
  AND lower(u.email) IN ('guisella@eminat.net','gnegrete@eminat.net');

ALTER TABLE public.sales_patient_identities ADD COLUMN lead_id uuid;
ALTER TABLE public.sales_patient_identities ADD CONSTRAINT sales_patient_identity_lead_fk
  FOREIGN KEY (organization_id,lead_id)
  REFERENCES public.sales_leads(organization_id,id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX sales_patient_identity_lead_unique
  ON public.sales_patient_identities(organization_id,lead_id) WHERE lead_id IS NOT NULL;

ALTER TABLE public.sales_patient_enrollment_intents ADD COLUMN opportunity_id uuid;
ALTER TABLE public.sales_patient_enrollment_intents ADD COLUMN payment_link_reference text;
ALTER TABLE public.sales_patient_enrollment_intents ADD CONSTRAINT sales_patient_intent_opportunity_fk
  FOREIGN KEY (organization_id,opportunity_id)
  REFERENCES public.sales_opportunities(organization_id,id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX sales_patient_intent_opportunity_unique
  ON public.sales_patient_enrollment_intents(organization_id,opportunity_id)
  WHERE opportunity_id IS NOT NULL;

CREATE FUNCTION public.native_sales_patient_ensure_lead(p_identity_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_identity public.sales_patient_identities%ROWTYPE;
DECLARE v_contact public.sales_contacts%ROWTYPE;
DECLARE v_lead uuid;
DECLARE v_owner uuid;
DECLARE v_team uuid;
DECLARE v_position smallint;
DECLARE v_last smallint;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'PATIENT_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_identity FROM public.sales_patient_identities
    WHERE id=p_identity_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PATIENT_IDENTITY_NOT_FOUND'; END IF;
  IF v_identity.lead_id IS NOT NULL THEN RETURN v_identity.lead_id; END IF;
  SELECT * INTO v_contact FROM public.sales_contacts WHERE organization_id=v_identity.organization_id
    AND id=v_identity.contact_id AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PATIENT_CONTACT_NOT_FOUND'; END IF;
  SELECT id INTO v_lead FROM public.sales_leads
    WHERE organization_id=v_identity.organization_id AND origin_contact_id=v_contact.id
      AND archived_at IS NULL ORDER BY created_at,id LIMIT 1;
  IF v_lead IS NOT NULL THEN
    UPDATE public.sales_patient_identities SET lead_id=v_lead WHERE id=v_identity.id;
    RETURN v_lead;
  END IF;
  INSERT INTO public.sales_patient_assignment_state(organization_id)
    VALUES (v_identity.organization_id) ON CONFLICT DO NOTHING;
  SELECT last_position INTO v_last FROM public.sales_patient_assignment_state
    WHERE organization_id=v_identity.organization_id FOR UPDATE;
  SELECT a.member_id,a.position INTO v_owner,v_position
  FROM public.sales_patient_assignment_order a
  JOIN public.sales_members m ON m.organization_id=a.organization_id AND m.id=a.member_id
  JOIN public.usuarios u ON u.id=m.user_id AND u.auth_id=m.auth_id
  JOIN public.sales_team_members tm ON tm.organization_id=a.organization_id AND tm.member_id=m.id
  JOIN public.sales_teams t ON t.organization_id=tm.organization_id AND t.id=tm.team_id
  WHERE a.organization_id=v_identity.organization_id AND a.enabled AND m.status='active'
    AND m.role='SELLER' AND u.activo AND t.active AND t.name='Corazón Salud Sales'
  ORDER BY CASE WHEN a.position>v_last THEN 0 ELSE 1 END,a.position LIMIT 1;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'EMC_ACTIVE_SELLER_REQUIRED'; END IF;
  SELECT tm.team_id INTO v_team FROM public.sales_team_members tm
    JOIN public.sales_teams t ON t.organization_id=tm.organization_id AND t.id=tm.team_id
    WHERE tm.organization_id=v_identity.organization_id AND tm.member_id=v_owner
      AND t.active AND t.name='Corazón Salud Sales'
    ORDER BY tm.team_id LIMIT 1;
  UPDATE public.sales_patient_assignment_state SET last_position=v_position
    WHERE organization_id=v_identity.organization_id;
  UPDATE public.sales_contacts SET owner_member_id=v_owner,team_id=v_team,
    updated_by=v_owner,updated_at=now(),version=version+1
    WHERE organization_id=v_identity.organization_id AND id=v_contact.id;
  INSERT INTO public.sales_leads
    (organization_id,owner_member_id,team_id,display_name,first_name,last_name,
     email,phone,status,source,source_detail,corazon_salud,origin_contact_id,
     created_by,updated_by)
  VALUES (v_identity.organization_id,v_owner,v_team,v_contact.display_name,
    v_contact.first_name,v_contact.last_name,v_contact.email,v_contact.phone,
    'NEW','Patient Portal','Portal Registration',true,v_contact.id,v_owner,v_owner)
  RETURNING id INTO v_lead;
  UPDATE public.sales_patient_identities SET lead_id=v_lead WHERE id=v_identity.id;
  INSERT INTO public.sales_history
    (organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
  VALUES (v_identity.organization_id,'lead',v_lead,v_owner,'patient_portal_registered',
    gen_random_uuid(),jsonb_build_object('contactId',v_contact.id));
  RETURN v_lead;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_patient_ensure_lead(uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_ensure_lead(uuid) TO service_role;

CREATE FUNCTION public.native_sales_patient_lead_after_bind()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF NEW.organization_id='9efab353-46a0-43d1-9901-e3f185dc5d30' AND
     NEW.source='SELF_REGISTRATION' THEN
    PERFORM public.native_sales_patient_ensure_lead(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER sales_patient_identity_lead_after_bind
  AFTER INSERT ON public.sales_patient_identities FOR EACH ROW
  EXECUTE FUNCTION public.native_sales_patient_lead_after_bind();
REVOKE ALL ON FUNCTION public.native_sales_patient_lead_after_bind()
  FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.native_sales_patient_intent_opportunity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_identity public.sales_patient_identities%ROWTYPE;
DECLARE v_contact public.sales_contacts%ROWTYPE;
DECLARE v_stage public.sales_stages%ROWTYPE;
DECLARE v_account uuid;
DECLARE v_opportunity uuid;
DECLARE v_quote record;
BEGIN
  IF NEW.organization_id<>'9efab353-46a0-43d1-9901-e3f185dc5d30' THEN RETURN NEW; END IF;
  SELECT * INTO v_identity FROM public.sales_patient_identities
    WHERE organization_id=NEW.organization_id AND id=NEW.patient_identity_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'PATIENT_IDENTITY_NOT_FOUND'; END IF;
  PERFORM public.native_sales_patient_ensure_lead(v_identity.id);
  SELECT * INTO v_contact FROM public.sales_contacts
    WHERE organization_id=NEW.organization_id AND id=v_identity.contact_id FOR UPDATE;
  SELECT * INTO v_quote FROM public.native_sales_membership_quote(
    NEW.plan,NEW.membership_type,NEW.duration);
  IF v_quote.total_cents<>NEW.amount_cents OR v_quote.initial_months<>NEW.initial_months
    OR NEW.status NOT IN ('PAYMENT_UNAVAILABLE','PAYMENT_PENDING') THEN
    RAISE EXCEPTION 'PATIENT_INTENT_QUOTE_CONFLICT';
  END IF;
  SELECT s.* INTO v_stage FROM public.sales_stages s
    JOIN public.sales_pipelines p ON p.organization_id=s.organization_id AND p.id=s.pipeline_id
    WHERE s.organization_id=NEW.organization_id AND p.code='PATIENT_ENROLLMENT'
      AND p.active AND s.code='PAYMENT_PENDING';
  IF NOT FOUND THEN RAISE EXCEPTION 'EMC_PIPELINE_NOT_READY'; END IF;
  v_account:=v_contact.primary_account_id;
  IF v_account IS NULL THEN
    INSERT INTO public.sales_accounts
      (organization_id,owner_member_id,team_id,name,type,created_by,updated_by)
    VALUES (NEW.organization_id,v_contact.owner_member_id,v_contact.team_id,
      v_contact.display_name,'prospect',v_contact.owner_member_id,v_contact.owner_member_id)
    RETURNING id INTO v_account;
    UPDATE public.sales_contacts SET primary_account_id=v_account,version=version+1,
      updated_at=now(),updated_by=v_contact.owner_member_id
      WHERE organization_id=NEW.organization_id AND id=v_contact.id;
    INSERT INTO public.sales_account_contacts
      (organization_id,account_id,contact_id,is_primary)
    VALUES (NEW.organization_id,v_account,v_contact.id,true);
  END IF;
  INSERT INTO public.sales_opportunities
    (organization_id,owner_member_id,team_id,name,account_id,primary_contact_id,
     stage_id,probability,currency,amount,expected_close_date,description,
     source,product,created_by,updated_by)
  VALUES (NEW.organization_id,v_contact.owner_member_id,v_contact.team_id,
    'Corazón Salud enrollment '||NEW.id::text,v_account,v_contact.id,
    v_stage.id,v_stage.probability,'USD',NEW.amount_cents::numeric/100,
    current_date+30,
    'Plan: '||NEW.plan||'; Type: '||NEW.membership_type||'; Modality: '||NEW.duration,
    'Patient Portal','Corazón Salud',v_contact.owner_member_id,v_contact.owner_member_id)
  RETURNING id INTO v_opportunity;
  INSERT INTO public.sales_opportunity_contacts(organization_id,opportunity_id,contact_id)
    VALUES (NEW.organization_id,v_opportunity,v_contact.id);
  UPDATE public.sales_patient_enrollment_intents SET opportunity_id=v_opportunity
    WHERE id=NEW.id;
  INSERT INTO public.sales_history
    (organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
  VALUES (NEW.organization_id,'opportunity',v_opportunity,v_contact.owner_member_id,
    'patient_enrollment_pending',gen_random_uuid(),
    jsonb_build_object('intentId',NEW.id,'plan',NEW.plan,'type',NEW.membership_type,
      'duration',NEW.duration,'amountCents',NEW.amount_cents));
  RETURN NEW;
END;
$$;
CREATE TRIGGER sales_patient_intent_opportunity_after_insert
  AFTER INSERT ON public.sales_patient_enrollment_intents FOR EACH ROW
  EXECUTE FUNCTION public.native_sales_patient_intent_opportunity();
REVOKE ALL ON FUNCTION public.native_sales_patient_intent_opportunity()
  FROM PUBLIC,anon,authenticated;

-- The existing self-registration function's pending owner is an administrative
-- insertion actor only. The trigger above assigns the new Contact and Lead to
-- an active EMC Seller in the same transaction. Keep the owner-approved Freddy
-- fallback valid after active Sellers join EMC; no other pending owner qualifies.
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
       AND organization_id=p_organization_id AND status='pending' AND role='SUPERADMIN'
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
