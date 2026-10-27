\set ON_ERROR_STOP on
-- Synthetic, transaction-only rehearsal. Never run this against Production.
BEGIN;
SET LOCAL request.jwt.claim.role='service_role';
INSERT INTO auth.users(id,email,email_confirmed_at) VALUES
  ('3b1d0b87-083e-46ef-b7e1-1cd662360085','freddy@eminat.net',now()),
  ('11000000-0000-4000-8000-000000000051','qa-context-before@example.invalid',now()),
  ('11000000-0000-4000-8000-000000000052','qa-context-after@example.invalid',now());
INSERT INTO public.usuarios(id,auth_id,email,nombre,apellido,rol,validado,activo) VALUES
  ('2344e112-76ef-42a8-ac56-7c488084e0f5','3b1d0b87-083e-46ef-b7e1-1cd662360085',
   'freddy@eminat.net','QA','Admin','admin',true,true);
INSERT INTO public.sales_organizations(id,code,name,status,approved_by,approved_at) VALUES
  ('31000000-0000-4000-8000-000000000051','stratix','QA Stratix','active',
   '2344e112-76ef-42a8-ac56-7c488084e0f5',now()),
  ('9efab353-46a0-43d1-9901-e3f185dc5d30','emc','Eminat Medical Center','active',
   '2344e112-76ef-42a8-ac56-7c488084e0f5',now());
INSERT INTO public.sales_members
  (id,organization_id,user_id,auth_id,display_name,role,status,evidence_ref,approved_by,approved_at)
VALUES
  ('41000000-0000-4000-8000-000000000051','31000000-0000-4000-8000-000000000051',
   '2344e112-76ef-42a8-ac56-7c488084e0f5','3b1d0b87-083e-46ef-b7e1-1cd662360085',
   'QA Admin','SUPERADMIN','active','owner-approved-freddy-stratix-2026-10-19',
   '2344e112-76ef-42a8-ac56-7c488084e0f5',now()),
  ('c67e9779-9e87-48b0-9f6c-bf6a0c8cebad','9efab353-46a0-43d1-9901-e3f185dc5d30',
   '2344e112-76ef-42a8-ac56-7c488084e0f5','3b1d0b87-083e-46ef-b7e1-1cd662360085',
   'QA Admin','SUPERADMIN','pending','owner-approved-emc-patient-fallback-2026-10-20',
   '2344e112-76ef-42a8-ac56-7c488084e0f5',now());

INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES
 ('11000000-0000-4000-8000-000000000053','new@gmail.com',NULL,'{"corazon_patient_signup":true}'),
 ('11000000-0000-4000-8000-000000000054','unverified@emc.health',NULL,'{}'),
 ('11000000-0000-4000-8000-000000000055','blocked@emc.health',now(),'{}');
UPDATE auth.users SET banned_until=now()+interval '1 day' WHERE email='blocked@emc.health';
DO $$
DECLARE c uuid; again uuid; employee_before jsonb; memberships_before jsonb;
BEGIN
  SELECT to_jsonb(u) INTO employee_before FROM public.usuarios u WHERE auth_id='3b1d0b87-083e-46ef-b7e1-1cd662360085';
  SELECT jsonb_agg(to_jsonb(m) ORDER BY m.id) INTO memberships_before FROM public.sales_members m;
  IF NOT public.native_sales_patient_registration_can_recover(' FREDDY@EMINAT.NET ') OR
     NOT public.native_sales_patient_registration_can_recover('qa-context-before@example.invalid') OR
     NOT public.native_sales_patient_registration_can_recover('new@gmail.com') OR
     public.native_sales_patient_registration_can_recover('unverified@emc.health') OR
     public.native_sales_patient_registration_can_recover('blocked@emc.health') OR
     public.native_sales_patient_registration_can_recover('unknown@example.invalid') THEN
    RAISE EXCEPTION 'STAFF_RECOVERY_OWNERSHIP_ELIGIBILITY_FAILED';
  END IF;
  c:=public.native_sales_patient_claim_contact('3b1d0b87-083e-46ef-b7e1-1cd662360085','freddy@eminat.net',
    'Synthetic','Patient',NULL,'9efab353-46a0-43d1-9901-e3f185dc5d30','c67e9779-9e87-48b0-9f6c-bf6a0c8cebad');
  again:=public.native_sales_patient_claim_contact('3b1d0b87-083e-46ef-b7e1-1cd662360085','freddy@eminat.net',
    'Synthetic','Patient',NULL,'9efab353-46a0-43d1-9901-e3f185dc5d30','c67e9779-9e87-48b0-9f6c-bf6a0c8cebad');
  IF c<>again OR (SELECT count(*) FROM public.sales_patient_identities)<>1 OR
     (SELECT count(*) FROM public.sales_contacts)<>1 OR (SELECT count(*) FROM public.sales_leads)<>1 OR
     public.native_sales_patient_registration_can_recover('freddy@eminat.net') THEN
    RAISE EXCEPTION 'STAFF_PATIENT_DUPLICATED_OR_REENROLLED'; END IF;
  IF employee_before IS DISTINCT FROM (SELECT to_jsonb(u) FROM public.usuarios u WHERE auth_id='3b1d0b87-083e-46ef-b7e1-1cd662360085') OR
     memberships_before IS DISTINCT FROM (SELECT jsonb_agg(to_jsonb(m) ORDER BY m.id) FROM public.sales_members m) OR
     (SELECT first_name FROM public.sales_contacts WHERE id=c)<>'Synthetic' OR
     (SELECT source FROM public.sales_contacts WHERE id=c)<>'PATIENT_PORTAL' OR
     (SELECT organization_id FROM public.sales_contacts WHERE id=c)<>'9efab353-46a0-43d1-9901-e3f185dc5d30' THEN
    RAISE EXCEPTION 'STAFF_PATIENT_DATA_ISOLATION_FAILED'; END IF;
  -- A different verified Auth identity with a matching Contact email is still
  -- a review conflict, never automatic proof of ownership.
  INSERT INTO public.sales_contacts(organization_id,owner_member_id,display_name,email,source,created_by,updated_by)
    VALUES('9efab353-46a0-43d1-9901-e3f185dc5d30','c67e9779-9e87-48b0-9f6c-bf6a0c8cebad','Existing commercial contact',
    'qa-context-before@example.invalid','MANUAL','c67e9779-9e87-48b0-9f6c-bf6a0c8cebad','c67e9779-9e87-48b0-9f6c-bf6a0c8cebad');
  BEGIN
    PERFORM public.native_sales_patient_claim_contact('11000000-0000-4000-8000-000000000051','qa-context-before@example.invalid',
      'Conflict','Patient',NULL,'9efab353-46a0-43d1-9901-e3f185dc5d30','c67e9779-9e87-48b0-9f6c-bf6a0c8cebad');
    RAISE EXCEPTION 'EMAIL_ONLY_CONTACT_TAKEOVER';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'PATIENT_CONTACT_REVIEW_REQUIRED' THEN RAISE; END IF; END;
  BEGIN
    PERFORM public.native_sales_patient_claim_contact('11000000-0000-4000-8000-000000000052','freddy@eminat.net',
      'Wrong','Owner',NULL,'9efab353-46a0-43d1-9901-e3f185dc5d30','c67e9779-9e87-48b0-9f6c-bf6a0c8cebad');
    RAISE EXCEPTION 'AUTH_EMAIL_MISMATCH_ACCEPTED';
  EXCEPTION WHEN insufficient_privilege THEN IF SQLERRM<>'PATIENT_AUTH_IDENTITY_UNVERIFIED' THEN RAISE; END IF; END;
  IF EXISTS(SELECT 1 FROM public.sales_payments) OR EXISTS(SELECT 1 FROM public.sales_memberships) OR
     EXISTS(SELECT 1 FROM public.sales_qbo_invoice_jobs) THEN RAISE EXCEPTION 'ONBOARDING_CREATED_FINANCIAL_RECORDS'; END IF;
  IF has_function_privilege('authenticated','public.native_sales_patient_registration_can_recover(text)','execute') OR
     has_function_privilege('anon','public.native_sales_patient_registration_can_recover(text)','execute') THEN
    RAISE EXCEPTION 'PUBLIC_IDENTITY_ENUMERATION_GRANTED'; END IF;
END $$;
ROLLBACK;
