\set ON_ERROR_STOP on
BEGIN;
SET LOCAL request.jwt.claim.role='service_role';
INSERT INTO auth.users(id) VALUES
  ('11000000-0000-4000-8000-000000000021'),
  ('11000000-0000-4000-8000-000000000022');
INSERT INTO public.usuarios(id,auth_id,email,nombre,apellido,rol,validado,activo) VALUES
  ('21000000-0000-4000-8000-000000000021','11000000-0000-4000-8000-000000000021',
   'qa-reselection-seller@example.invalid','QA','Seller','sin_asignar',true,true);
INSERT INTO public.sales_organizations(id,code,name,status,approved_by,approved_at) VALUES
  ('9efab353-46a0-43d1-9901-e3f185dc5d30','emc','Eminat Medical Center','active',
   '21000000-0000-4000-8000-000000000021',now());
INSERT INTO public.sales_members
  (id,organization_id,user_id,auth_id,display_name,role,status,evidence_ref,approved_by,approved_at)
VALUES ('41000000-0000-4000-8000-000000000021',
  '9efab353-46a0-43d1-9901-e3f185dc5d30',
  '21000000-0000-4000-8000-000000000021',
  '11000000-0000-4000-8000-000000000021','QA Seller','SELLER','active',
  'local-transaction-only','21000000-0000-4000-8000-000000000021',now());
INSERT INTO public.sales_teams(id,organization_id,name) VALUES
  ('51000000-0000-4000-8000-000000000021',
   '9efab353-46a0-43d1-9901-e3f185dc5d30','Corazón Salud Sales');
INSERT INTO public.sales_team_members(organization_id,team_id,member_id) VALUES
  ('9efab353-46a0-43d1-9901-e3f185dc5d30',
   '51000000-0000-4000-8000-000000000021',
   '41000000-0000-4000-8000-000000000021');
INSERT INTO public.sales_patient_assignment_order(organization_id,member_id,position) VALUES
  ('9efab353-46a0-43d1-9901-e3f185dc5d30',
   '41000000-0000-4000-8000-000000000021',1);
INSERT INTO public.sales_pipelines(id,organization_id,code,name) VALUES
  ('61000000-0000-4000-8000-000000000021',
   '9efab353-46a0-43d1-9901-e3f185dc5d30','PATIENT_ENROLLMENT','QA Enrollment');
INSERT INTO public.sales_stages
  (id,organization_id,pipeline_id,code,name,position,probability,outcome) VALUES
  ('71000000-0000-4000-8000-000000000021',
   '9efab353-46a0-43d1-9901-e3f185dc5d30',
   '61000000-0000-4000-8000-000000000021','PAYMENT_PENDING','Payment Pending',0,20,'OPEN'),
  ('72000000-0000-4000-8000-000000000021',
   '9efab353-46a0-43d1-9901-e3f185dc5d30',
   '61000000-0000-4000-8000-000000000021','LOST','Lost',1,0,'LOST');
INSERT INTO public.sales_contacts
  (id,organization_id,owner_member_id,display_name,first_name,last_name,email,
   source,created_by,updated_by)
VALUES ('22000000-0000-4000-8000-000000000021',
  '9efab353-46a0-43d1-9901-e3f185dc5d30',
  '41000000-0000-4000-8000-000000000021','Patient QA Reselection','Patient QA',
  'Reselection','qa-reselection-patient@example.invalid','PATIENT_PORTAL',
  '41000000-0000-4000-8000-000000000021',
  '41000000-0000-4000-8000-000000000021');
INSERT INTO public.sales_patient_identities
  (id,organization_id,auth_id,contact_id,source,approved_evidence)
VALUES ('32000000-0000-4000-8000-000000000021',
  '9efab353-46a0-43d1-9901-e3f185dc5d30',
  '11000000-0000-4000-8000-000000000022',
  '22000000-0000-4000-8000-000000000021','SELF_REGISTRATION',
  'local transaction-only rehearsal');
DO $$
DECLARE first_result jsonb; second_result jsonb; replay jsonb; initial_opportunity uuid;
BEGIN
  first_result:=public.native_sales_patient_enroll(
    '32000000-0000-4000-8000-000000000021',
    'ESSENTIAL','INDIVIDUAL','MONTHLY','81000000-0000-4000-8000-000000000021');
  initial_opportunity:=(first_result->>'opportunity_id')::uuid;
  PERFORM public.native_sales_patient_selection_action(
    '32000000-0000-4000-8000-000000000021',
    'CANCEL',NULL,NULL,NULL,'82000000-0000-4000-8000-000000000021');
  second_result:=public.native_sales_patient_enroll(
    '32000000-0000-4000-8000-000000000021',
    'ESSENTIAL','FAMILY','MONTHLY','83000000-0000-4000-8000-000000000021');
  replay:=public.native_sales_patient_enroll(
    '32000000-0000-4000-8000-000000000021',
    'ESSENTIAL','FAMILY','MONTHLY','83000000-0000-4000-8000-000000000021');
  IF initial_opportunity IS NULL OR
    (second_result->>'opportunity_id')::uuid<>initial_opportunity OR
    (replay->>'id')::uuid<>(second_result->>'id')::uuid OR
    (SELECT count(*) FROM public.sales_opportunities
      WHERE primary_contact_id='22000000-0000-4000-8000-000000000021')<>1 OR
    (SELECT count(*) FROM public.sales_patient_enrollment_intents
      WHERE patient_identity_id='32000000-0000-4000-8000-000000000021'
        AND status<>'CANCELLED')<>1 OR
    NOT EXISTS (SELECT 1 FROM public.sales_opportunities
      WHERE id=initial_opportunity AND stage_id='71000000-0000-4000-8000-000000000021'
        AND amount=199.98 AND lost_reason IS NULL) OR
    NOT EXISTS (SELECT 1 FROM public.sales_history
      WHERE record_id=initial_opportunity AND action='patient_enrollment_reselected') THEN
    RAISE EXCEPTION 'PATIENT_RESELECTION_CREATED_DUPLICATE_OPPORTUNITY';
  END IF;
END $$;
ROLLBACK;
