\set ON_ERROR_STOP on
-- ISOLATED CI DATABASE ONLY. Simulated provider evidence, no network/payment.
-- The complete synthetic rehearsal is rolled back, including every identity.
BEGIN;
SET LOCAL request.jwt.claim.role='service_role';
DO $$
DECLARE org uuid:='9efab353-46a0-43d1-9901-e3f185dc5d30';
DECLARE admin_user uuid:='2344e112-76ef-42a8-ac56-7c488084e0f5';
DECLARE admin_auth uuid:=gen_random_uuid();
DECLARE admin_member uuid:='c67e9779-9e87-48b0-9f6c-bf6a0c8cebad';
DECLARE seller_auth uuid:=gen_random_uuid(); seller_user uuid:=gen_random_uuid(); seller uuid:=gen_random_uuid();
DECLARE patient uuid; identity uuid; other_identity uuid; contact uuid; child uuid; pipeline uuid:=gen_random_uuid();
DECLARE initial_intent uuid; membership uuid; request_key uuid; renewal uuid; cancelled uuid;
DECLARE count_extra integer; idx integer; draft uuid; reviewed_at timestamptz; draft_row public.sales_patient_family_draft_members%ROWTYPE;
DECLARE result jsonb; replay jsonb; initial_quote record; renewal_quote record;
DECLARE q public.sales_patient_qbo_manual%ROWTYPE; job public.sales_qbo_invoice_jobs%ROWTYPE;
DECLARE old_expiry date; old_code text; household_before jsonb; household_after jsonb;
DECLARE term_type text; issued date:=(current_date-interval '2 months'+interval '5 days')::date;
DECLARE before_contacts bigint; before_leads bigint; expected_paid integer:=0; report jsonb;
BEGIN
  IF has_function_privilege('authenticated','public.native_sales_patient_complete_renewal(uuid)','EXECUTE')
    OR has_function_privilege('anon','public.native_sales_patient_request_online_renewal(uuid,uuid,uuid)','EXECUTE')
    OR has_function_privilege('authenticated','public.native_sales_online_renewal_status(uuid,uuid,uuid,integer,integer)','EXECUTE') THEN
    RAISE EXCEPTION 'RENEWAL_BROWSER_EXECUTE_ALLOWED'; END IF;
  INSERT INTO auth.users(id) VALUES(admin_auth),(seller_auth);
  INSERT INTO public.usuarios(id,auth_id,email,nombre,apellido,rol,validado,activo) VALUES
    (admin_user,admin_auth,'qa-renewal-admin@example.invalid','QA','Admin','admin',true,true),
    (seller_user,seller_auth,'qa-renewal-seller@example.invalid','QA','Seller','admin',true,true);
  INSERT INTO public.sales_organizations(id,code,name,status,approved_by,approved_at)
    VALUES(org,'qa-renewal-emc','QA Renewal EMC','active',admin_user,now());
  INSERT INTO public.sales_members(id,organization_id,user_id,auth_id,role,status,evidence_ref,approved_by,approved_at) VALUES
    (admin_member,org,admin_user,admin_auth,'SUPERADMIN','active','owner-approved-emc-patient-fallback-2026-10-20',admin_user,now()),
    (seller,org,seller_user,seller_auth,'SELLER','active','isolated-renewal-rehearsal',admin_user,now());
  IF NOT public.native_sales_patient_qbo_owner(admin_member) OR public.native_sales_patient_qbo_owner(seller) THEN
    RAISE EXCEPTION 'ACTIVE_ADMIN_OR_SELLER_QBO_POLICY_REGRESSION'; END IF;
  INSERT INTO public.sales_pipelines(id,organization_id,code,name) VALUES(pipeline,org,'PATIENT_ENROLLMENT','QA Enrollment');
  INSERT INTO public.sales_stages(organization_id,pipeline_id,code,name,position,probability,outcome) VALUES
    (org,pipeline,'PAYMENT_PENDING','Pending',0,20,'OPEN'),(org,pipeline,'WON','Paid',1,100,'WON'),(org,pipeline,'LOST','Lost',2,0,'LOST');

  FOREACH count_extra IN ARRAY ARRAY[0,1,2,3,5,9] LOOP
    patient:=gen_random_uuid();
    INSERT INTO auth.users(id,email,email_confirmed_at) VALUES(patient,'qa-family-'||count_extra||'@example.invalid',now());
    contact:=public.native_sales_patient_claim_contact(patient,'qa-family-'||count_extra||'@example.invalid','QA','Family '||count_extra,'+15550100001',org,admin_member);
    SELECT id INTO identity FROM public.sales_patient_identities WHERE auth_id=patient;
    UPDATE public.sales_contacts SET owner_member_id=seller,do_not_email=true,address='{"street":"Synthetic only","city":"Miami","state":"FL","postalCode":"33101","country":"US"}'::jsonb WHERE id=contact;
    request_key:=gen_random_uuid();
    result:=public.native_sales_patient_enroll(identity,'ESSENTIAL','FAMILY','MONTHLY',request_key,count_extra);
    initial_intent:=(result->>'id')::uuid;
    replay:=public.native_sales_patient_enroll(identity,'ESSENTIAL','FAMILY','MONTHLY',request_key,count_extra);
    IF replay->>'id'<>initial_intent::text THEN RAISE EXCEPTION 'FAMILY_ENROLLMENT_RETRY_DUPLICATE'; END IF;
    SELECT * INTO initial_quote FROM public.native_sales_family_expanded_quote('ESSENTIAL','MONTHLY',count_extra,false);
    IF (result->>'amount_cents')::integer<>initial_quote.total_cents THEN RAISE EXCEPTION 'FAMILY_TOTAL_MISMATCH'; END IF;

    IF count_extra=2 THEN
      result:=public.native_sales_patient_family_draft_action(identity,'ADD',NULL,'Temporary QA','Person',DATE '2013-01-01','CHILD',gen_random_uuid(),true);
      draft:=(result->>'memberId')::uuid;
      SELECT * INTO draft_row FROM public.sales_patient_family_draft_members WHERE id=draft;
      PERFORM public.native_sales_review_family_preparation(org,admin_member,initial_intent,draft,'APPROVED',draft_row.updated_at,gen_random_uuid());
      result:=public.native_sales_patient_selection_action(identity,'CHANGE','ESSENTIAL','FAMILY','MONTHLY',gen_random_uuid(),3);
      initial_intent:=(result->>'intentId')::uuid;
      IF (SELECT review_status FROM public.sales_patient_family_draft_members WHERE id=draft)<>'PENDING'
        OR (SELECT enrollment_intent_id FROM public.sales_patient_family_draft_members WHERE id=draft)<>initial_intent THEN RAISE EXCEPTION 'CHANGED_QUOTE_KEPT_APPROVAL_OR_LOST_DETAILS'; END IF;
      PERFORM public.native_sales_patient_family_draft_action(identity,'REMOVE',draft,NULL,NULL,NULL,NULL,gen_random_uuid(),true);
      result:=public.native_sales_patient_selection_action(identity,'CHANGE','ESSENTIAL','FAMILY','MONTHLY',gen_random_uuid(),2);
      initial_intent:=(result->>'intentId')::uuid;
      IF (SELECT amount_cents FROM public.sales_patient_enrollment_intents WHERE id=initial_intent)<>initial_quote.total_cents THEN RAISE EXCEPTION 'FAMILY_DECREMENT_TOTAL_INVALID'; END IF;
    END IF;
    PERFORM public.native_sales_patient_accept_agreement(identity,patient,initial_intent,'es');
    FOR idx IN 1..2+count_extra LOOP
      result:=public.native_sales_patient_family_draft_action(identity,'ADD',NULL,'QA child '||count_extra,'Person '||idx,DATE '2015-01-01','CHILD',gen_random_uuid(),true);
      draft:=(result->>'memberId')::uuid;
      SELECT * INTO draft_row FROM public.sales_patient_family_draft_members WHERE id=draft;
      BEGIN
        PERFORM public.native_sales_review_family_preparation(org,seller,initial_intent,draft,'APPROVED',draft_row.updated_at,gen_random_uuid());
        RAISE EXCEPTION 'SELLER_APPROVED_FAMILY';
      EXCEPTION WHEN SQLSTATE '42501' THEN IF SQLERRM<>'FAMILY_APPROVAL_FORBIDDEN' THEN RAISE; END IF; END;
      IF public.native_sales_family_preparation_ready(initial_intent) THEN RAISE EXCEPTION 'UNAPPROVED_FAMILY_READY'; END IF;
      BEGIN
        PERFORM public.native_sales_qbo_claim_invoice(identity,initial_intent);
        RAISE EXCEPTION 'UNAPPROVED_FAMILY_INVOICE_ALLOWED';
      EXCEPTION WHEN SQLSTATE '42501' THEN IF SQLERRM<>'FAMILY_PREPARATION_REVIEW_REQUIRED' THEN RAISE; END IF; END;
      PERFORM public.native_sales_review_family_preparation(org,admin_member,initial_intent,draft,'APPROVED',draft_row.updated_at,gen_random_uuid());
      IF idx=1 AND count_extra=1 THEN
        PERFORM public.native_sales_patient_family_draft_action(identity,'EDIT',draft,'QA child edited '||count_extra,'Person '||idx,DATE '2015-01-01','CHILD',gen_random_uuid(),true);
        IF (SELECT review_status FROM public.sales_patient_family_draft_members WHERE id=draft)<>'PENDING' THEN RAISE EXCEPTION 'EDIT_KEPT_STAFF_APPROVAL'; END IF;
        SELECT * INTO draft_row FROM public.sales_patient_family_draft_members WHERE id=draft;
        PERFORM public.native_sales_review_family_preparation(org,admin_member,initial_intent,draft,'APPROVED',draft_row.updated_at,gen_random_uuid());
      END IF;
    END LOOP;

    BEGIN
      PERFORM public.native_sales_patient_family_draft_action(identity,'ADD',NULL,'Over capacity','Person',DATE '2012-01-01','CHILD',gen_random_uuid(),true);
      RAISE EXCEPTION 'EXCESS_FAMILY_DETAILS_ALLOWED';
    EXCEPTION WHEN SQLSTATE '22023' THEN IF SQLERRM<>'HOUSEHOLD_LIMIT_REACHED' THEN RAISE; END IF; END;
    IF NOT public.native_sales_family_preparation_ready(initial_intent) THEN RAISE EXCEPTION 'APPROVED_FAMILY_NOT_READY'; END IF;
    IF EXISTS(SELECT 1 FROM public.sales_household_members WHERE contact_id=contact) THEN RAISE EXCEPTION 'APPROVAL_ACTIVATED_COVERAGE'; END IF;
    SELECT * INTO job FROM public.native_sales_qbo_claim_invoice(identity,initial_intent);
    PERFORM public.native_sales_qbo_claim_invoice(identity,initial_intent);
    IF (SELECT count(*) FROM public.sales_qbo_invoice_jobs WHERE enrollment_intent_id=initial_intent)<>1 OR job.additional_member_count<>count_extra THEN RAISE EXCEPTION 'FAMILY_JOB_SNAPSHOT_OR_RETRY_INVALID'; END IF;
    INSERT INTO public.sales_qbo_customer_bindings(organization_id,contact_id,qbo_customer_id) VALUES(org,contact,(201+count_extra)::text);
    UPDATE public.sales_qbo_invoice_jobs SET state='INVOICE_CREATED',qbo_customer_id=(201+count_extra)::text,
      qbo_invoice_id=(101+count_extra)::text,qbo_invoice_number='CS-LOCAL-'||initial_intent::text WHERE id=job.id;
    q:=public.native_sales_qbo_finish_invoice(job.id,(201+count_extra)::text,'301',(101+count_extra)::text,'CS-LOCAL-'||initial_intent::text,'https://connect.intuit.com/t/local-family-not-real');
    IF EXISTS(SELECT 1 FROM public.sales_household_members WHERE contact_id=contact) THEN RAISE EXCEPTION 'INVOICE_ACTIVATED_COVERAGE'; END IF;
    q:=public.native_sales_patient_qbo_update(initial_intent,admin_member,'VERIFY_PAYMENT',p_payment_reference:='LOCAL-SIMULATED-'||initial_intent::text,p_payment_confirmed_at:=now());
    result:=public.native_sales_issue_membership(org,admin_member,q.sales_payment_id,contact,'ESSENTIAL','FAMILY','MONTHLY',current_date,
      'QA','Family '||count_extra,'+15550100001','qa-family-'||count_extra||'@example.invalid','QA address',false,
      'qa-family-initial-'||initial_intent::text,repeat('d',64),gen_random_uuid());
    membership:=(result->>'id')::uuid;
    IF (SELECT count(*) FROM public.sales_household_members WHERE membership_id=membership AND status='ACTIVE')<>3+count_extra
      OR (SELECT count(*) FROM public.sales_household_members WHERE membership_id=membership AND status='ACTIVE' AND is_additional)<>count_extra THEN RAISE EXCEPTION 'PAID_FAMILY_ACTIVATION_INCOMPLETE'; END IF;
    IF EXISTS(SELECT 1 FROM public.sales_household_members h JOIN public.sales_memberships m ON m.id=h.membership_id
      WHERE h.membership_id=membership AND h.member_code<>m.code||' '||public.native_sales_family_suffix(h.member_index)) THEN RAISE EXCEPTION 'FAMILY_CODE_SEQUENCE_INVALID'; END IF;
    replay:=public.native_sales_issue_membership(org,admin_member,q.sales_payment_id,contact,'ESSENTIAL','FAMILY','MONTHLY',current_date,
      'QA','Family '||count_extra,'+15550100001','qa-family-'||count_extra||'@example.invalid','QA address',false,
      'qa-family-initial-'||initial_intent::text,repeat('d',64),gen_random_uuid());
    IF replay->>'replayed'<>'true' OR (SELECT count(*) FROM public.sales_household_members WHERE membership_id=membership)<>3+count_extra THEN RAISE EXCEPTION 'DUPLICATE_FAMILY_ACTIVATION'; END IF;

    IF count_extra=0 THEN
      SELECT expires_at,code INTO old_expiry,old_code FROM public.sales_memberships WHERE id=membership;
      result:=public.native_sales_patient_family_addition_action(identity,membership,'CREATE',2,gen_random_uuid());
      renewal:=(result->>'id')::uuid;
      IF (SELECT amount_cents FROM public.sales_patient_enrollment_intents WHERE id=renewal)<>4999*2*2 THEN RAISE EXCEPTION 'FAMILY_PRORATED_TOTAL_INVALID'; END IF;
      BEGIN
        PERFORM public.native_sales_patient_complete_family_addition(renewal);
        RAISE EXCEPTION 'UNPAID_ADDITION_ACTIVATED';
      EXCEPTION WHEN SQLSTATE '42501' THEN IF SQLERRM<>'FAMILY_ADDITION_PAYMENT_NOT_VERIFIED' THEN RAISE; END IF; END;
      FOR idx IN 1..2 LOOP
        result:=public.native_sales_patient_family_draft_action(identity,'ADD',NULL,'QA addition','New person '||idx,DATE '2010-01-01','CHILD',gen_random_uuid(),true);
        draft:=(result->>'memberId')::uuid;
        SELECT * INTO draft_row FROM public.sales_patient_family_draft_members WHERE id=draft;
        PERFORM public.native_sales_review_family_preparation(org,admin_member,renewal,draft,'APPROVED',draft_row.updated_at,gen_random_uuid());
      END LOOP;
      SELECT * INTO job FROM public.native_sales_qbo_claim_invoice(identity,renewal);
      UPDATE public.sales_qbo_invoice_jobs SET state='INVOICE_CREATED',qbo_customer_id='201',qbo_invoice_id='900',qbo_invoice_number='CS-LOCAL-'||renewal::text WHERE id=job.id;
      q:=public.native_sales_qbo_finish_invoice(job.id,'201','301','900','CS-LOCAL-'||renewal::text,'https://connect.intuit.com/t/local-addition-not-real');
      q:=public.native_sales_patient_qbo_update(renewal,admin_member,'VERIFY_PAYMENT',p_payment_reference:='LOCAL-SIMULATED-'||renewal::text,p_payment_confirmed_at:=now());
      result:=public.native_sales_patient_complete_family_addition(renewal);
      replay:=public.native_sales_patient_complete_family_addition(renewal);
      IF replay->>'replayed'<>'true' OR (SELECT count(*) FROM public.sales_household_members WHERE membership_id=membership AND status='ACTIVE')<>5
        OR (SELECT code FROM public.sales_memberships WHERE id=membership)<>old_code OR (SELECT expires_at FROM public.sales_memberships WHERE id=membership)<>old_expiry
        OR (SELECT count(*) FROM public.sales_membership_periods WHERE membership_id=membership)<>1 THEN RAISE EXCEPTION 'FAMILY_ADDITION_REPLAY_OR_ROOT_CHANGED'; END IF;
      -- Historic D remains reserved; the next paid addition receives F, never D.
      UPDATE public.sales_household_members SET status='REMOVED' WHERE membership_id=membership AND member_index=4;
      result:=public.native_sales_patient_family_addition_action(identity,membership,'CREATE',1,gen_random_uuid());
      cancelled:=(result->>'id')::uuid;
      result:=public.native_sales_patient_family_draft_action(identity,'ADD',NULL,'QA final','New person final',DATE '2011-01-01','CHILD',gen_random_uuid(),true);
      draft:=(result->>'memberId')::uuid;
      SELECT * INTO draft_row FROM public.sales_patient_family_draft_members WHERE id=draft;
      PERFORM public.native_sales_review_family_preparation(org,admin_member,cancelled,draft,'APPROVED',draft_row.updated_at,gen_random_uuid());
      SELECT * INTO job FROM public.native_sales_qbo_claim_invoice(identity,cancelled);
      UPDATE public.sales_qbo_invoice_jobs SET state='INVOICE_CREATED',qbo_customer_id='201',qbo_invoice_id='901',qbo_invoice_number='CS-LOCAL-'||cancelled::text WHERE id=job.id;
      q:=public.native_sales_qbo_finish_invoice(job.id,'201','301','901','CS-LOCAL-'||cancelled::text,'https://connect.intuit.com/t/local-addition-not-real');
      q:=public.native_sales_patient_qbo_update(cancelled,admin_member,'VERIFY_PAYMENT',p_payment_reference:='LOCAL-SIMULATED-'||cancelled::text,p_payment_confirmed_at:=now());
      PERFORM public.native_sales_patient_complete_family_addition(cancelled);
      IF NOT EXISTS(SELECT 1 FROM public.sales_household_members WHERE membership_id=membership AND member_code=old_code||' F' AND status='ACTIVE') THEN RAISE EXCEPTION 'HISTORICAL_FAMILY_CODE_REUSED'; END IF;
      -- Existing online renewal prices and preserves the same active paid people.
      UPDATE public.sales_memberships SET expires_at=current_date+5 WHERE id=membership;
      result:=public.native_sales_patient_request_online_renewal(identity,membership,gen_random_uuid());
      renewal:=(result->>'id')::uuid;
      SELECT * INTO renewal_quote FROM public.native_sales_family_expanded_quote('ESSENTIAL','MONTHLY',2,true);
      IF (result->>'amount_cents')::integer<>renewal_quote.total_cents OR (result->>'additional_member_count')::integer<>2 THEN RAISE EXCEPTION 'FAMILY_RENEWAL_OMITTED_ADDITIONAL_MEMBERS'; END IF;
      SELECT * INTO job FROM public.native_sales_qbo_claim_invoice(identity,renewal);
      UPDATE public.sales_qbo_invoice_jobs SET state='INVOICE_CREATED',qbo_customer_id='201',qbo_invoice_id='902',qbo_invoice_number='CS-LOCAL-'||renewal::text WHERE id=job.id;
      q:=public.native_sales_qbo_finish_invoice(job.id,'201','301','902','CS-LOCAL-'||renewal::text,'https://connect.intuit.com/t/local-family-renewal-not-real');
      q:=public.native_sales_patient_qbo_update(renewal,admin_member,'VERIFY_PAYMENT',p_payment_reference:='LOCAL-SIMULATED-'||renewal::text,p_payment_confirmed_at:=now());
      result:=public.native_sales_patient_complete_renewal(renewal);
      IF (SELECT count(*) FROM public.sales_household_members WHERE membership_id=membership AND status='ACTIVE')<>5
        OR (SELECT code FROM public.sales_memberships WHERE id=membership)<>old_code THEN RAISE EXCEPTION 'FAMILY_RENEWAL_CHANGED_PEOPLE_OR_CODES'; END IF;

    END IF;
  END LOOP;
  IF public.native_sales_family_suffix(26)<>'Z' OR public.native_sales_family_suffix(27)<>'AA' OR public.native_sales_family_suffix_index('AA')<>27 THEN RAISE EXCEPTION 'FAMILY_SUFFIX_SEQUENCE'; END IF;
END;
$$;
ROLLBACK;
