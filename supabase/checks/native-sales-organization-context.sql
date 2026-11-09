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
DO $$
DECLARE first_contact uuid; second_contact uuid; retry uuid; row jsonb;
BEGIN
  PERFORM public.native_sales_controlled_emc_admin('check');
  first_contact:=public.native_sales_patient_claim_contact(
    '11000000-0000-4000-8000-000000000051','qa-context-before@example.invalid',
    'QA','Before',NULL,'9efab353-46a0-43d1-9901-e3f185dc5d30',
    'c67e9779-9e87-48b0-9f6c-bf6a0c8cebad');
  BEGIN
    PERFORM public.native_sales_portal_leads('9efab353-46a0-43d1-9901-e3f185dc5d30',
      'c67e9779-9e87-48b0-9f6c-bf6a0c8cebad');
    RAISE EXCEPTION 'PENDING_MEMBERSHIP_GRANTED_ACCESS';
  EXCEPTION WHEN insufficient_privilege THEN
    IF SQLERRM<>'SALES_ACCESS_DENIED' THEN RAISE; END IF;
  END;
  PERFORM public.native_sales_controlled_emc_admin('apply');
  PERFORM public.native_sales_controlled_emc_admin('apply');
  PERFORM public.native_sales_controlled_emc_admin('verify');
  second_contact:=public.native_sales_patient_claim_contact(
    '11000000-0000-4000-8000-000000000052','qa-context-after@example.invalid',
    'QA','After',NULL,'9efab353-46a0-43d1-9901-e3f185dc5d30',
    'c67e9779-9e87-48b0-9f6c-bf6a0c8cebad');
  retry:=public.native_sales_patient_claim_contact(
    '11000000-0000-4000-8000-000000000052','qa-context-after@example.invalid',
    'QA','After',NULL,'9efab353-46a0-43d1-9901-e3f185dc5d30',
    'c67e9779-9e87-48b0-9f6c-bf6a0c8cebad');
  IF retry<>second_contact OR first_contact=second_contact OR
    (SELECT count(*) FROM public.sales_contacts)<>2 OR
    (SELECT count(*) FROM public.sales_patient_identities)<>2 OR
    (SELECT count(*) FROM public.sales_leads)<>2 OR
    (SELECT count(*) FROM public.sales_members)<>2 OR
    (SELECT count(*) FROM public.sales_history WHERE action='emc_superadmin_access_activated')<>1 THEN
    RAISE EXCEPTION 'CONTEXT_ACTIVATION_NOT_IDEMPOTENT';
  END IF;
  IF (SELECT count(*) FROM public.native_sales_portal_leads(
      '9efab353-46a0-43d1-9901-e3f185dc5d30','c67e9779-9e87-48b0-9f6c-bf6a0c8cebad'))<>2 OR
    EXISTS(SELECT 1 FROM public.native_sales_portal_leads(
      '31000000-0000-4000-8000-000000000051','41000000-0000-4000-8000-000000000051')) THEN
    RAISE EXCEPTION 'ORGANIZATION_RECORD_ISOLATION_FAILED';
  END IF;
  FOR row IN SELECT * FROM public.native_sales_portal_leads(
    '9efab353-46a0-43d1-9901-e3f185dc5d30','c67e9779-9e87-48b0-9f6c-bf6a0c8cebad') LOOP
    IF row->>'assignmentStatus'<>'NEEDS_ASSIGNMENT' OR row->>'leadStatus'<>'NEW'
      OR row->>'source'<>'Patient Portal' OR row->>'invoiceStatus'<>'NOT_CREATED'
      OR row->>'paymentStatus'<>'UNPAID' OR row->>'membershipStatus'<>'NOT_ACTIVE' THEN
      RAISE EXCEPTION 'UNASSIGNED_PATIENT_RULE_CHANGED';
    END IF;
  END LOOP;
  IF EXISTS(SELECT 1 FROM public.sales_payments) OR EXISTS(SELECT 1 FROM public.sales_memberships)
    OR EXISTS(SELECT 1 FROM public.sales_qbo_invoice_jobs)
    OR EXISTS(SELECT 1 FROM public.sales_patient_enrollment_intents) THEN
    RAISE EXCEPTION 'ORGANIZATION_ACCESS_TOUCHED_COMMERCIAL_DATA';
  END IF;
  PERFORM public.native_sales_controlled_emc_admin('rollback');
  PERFORM public.native_sales_controlled_emc_admin('rollback');
  IF (SELECT status FROM public.sales_members WHERE id='c67e9779-9e87-48b0-9f6c-bf6a0c8cebad')<>'pending'
    OR (SELECT count(*) FROM public.sales_history WHERE action='emc_superadmin_access_rolled_back')<>1
    OR (SELECT count(*) FROM public.sales_leads)<>2 THEN
    RAISE EXCEPTION 'EMC_ACCESS_ROLLBACK_NOT_SCOPED_OR_IDEMPOTENT';
  END IF;
  UPDATE public.sales_members SET evidence_ref='not-approved'
    WHERE id='c67e9779-9e87-48b0-9f6c-bf6a0c8cebad';
  BEGIN
    PERFORM public.native_sales_controlled_emc_admin('apply');
    RAISE EXCEPTION 'UNAPPROVED_BINDING_ACCEPTED';
  EXCEPTION WHEN insufficient_privilege THEN
    IF SQLERRM<>'EMC_ADMIN_MEMBERSHIP_MISMATCH' THEN RAISE; END IF;
  END;
END $$;
ROLLBACK;
