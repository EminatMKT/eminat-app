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
DECLARE patient uuid; identity uuid; contact uuid; child uuid; pipeline uuid:=gen_random_uuid();
DECLARE initial_intent uuid; membership uuid; request_key uuid; renewal uuid; cancelled uuid;
DECLARE result jsonb; replay jsonb; initial_quote record; renewal_quote record;
DECLARE q public.sales_patient_qbo_manual%ROWTYPE; job public.sales_qbo_invoice_jobs%ROWTYPE;
DECLARE old_expiry date; old_code text; household_before jsonb; household_after jsonb;
DECLARE term_type text; issued date:=(current_date-interval '2 months'+interval '5 days')::date;
DECLARE before_contacts bigint; before_leads bigint; expected_paid integer:=0; report jsonb;
BEGIN
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
  FOREACH term_type IN ARRAY ARRAY['INDIVIDUAL','FAMILY'] LOOP
    patient:=gen_random_uuid();
    INSERT INTO auth.users(id,email,email_confirmed_at) VALUES(patient,'qa-renewal-'||lower(term_type)||'@example.invalid',now());
    contact:=public.native_sales_patient_claim_contact(patient,'qa-renewal-'||lower(term_type)||'@example.invalid','QA','Renewal','555-0100',org,admin_member);
    SELECT id INTO identity FROM public.sales_patient_identities WHERE auth_id=patient;
    UPDATE public.sales_contacts SET owner_member_id=seller,do_not_email=true WHERE id=contact;
    result:=public.native_sales_patient_enroll(identity,'ESSENTIAL',term_type,'MONTHLY',gen_random_uuid());
    initial_intent:=(result->>'id')::uuid;
    PERFORM public.native_sales_patient_accept_agreement(identity,patient,initial_intent,'es');
    SELECT * INTO initial_quote FROM public.native_sales_membership_quote('ESSENTIAL',term_type,'MONTHLY');
    PERFORM public.native_sales_patient_qbo_update(initial_intent,admin_member,'RECORD_INVOICE',
      p_invoice_number:='CS-LOCAL-'||initial_intent::text,p_invoice_reference:=CASE term_type WHEN 'FAMILY' THEN '1002' ELSE '1001' END,p_customer_reference:='201',p_item_reference:='301',
      p_invoice_amount_cents:=initial_quote.total_cents,p_hosted_url:='https://connect.intuit.com/t/local-not-real');
    q:=public.native_sales_patient_qbo_update(initial_intent,admin_member,'VERIFY_PAYMENT',
      p_payment_reference:='LOCAL-SIMULATED-'||initial_intent::text,p_payment_confirmed_at:=issued::timestamptz);
    result:=public.native_sales_issue_membership(org,admin_member,q.sales_payment_id,contact,'ESSENTIAL',term_type,'MONTHLY',issued,
      'QA','Renewal','555-0100','qa-renewal-'||lower(term_type)||'@example.invalid','QA address',false,
      'qa-renewal-initial-'||initial_intent::text,repeat('d',64),gen_random_uuid());
    membership:=(result->>'id')::uuid;
    SELECT expires_at,code INTO old_expiry,old_code FROM public.sales_memberships WHERE id=membership;
    IF term_type='FAMILY' THEN
      result:=public.native_sales_patient_family_request(identity,admin_member,'QA','Child',DATE '2015-01-01','CHILD',gen_random_uuid());
      PERFORM public.native_sales_review_family_member(org,admin_member,membership,(result->>'id')::uuid,'APPROVED',gen_random_uuid());
    END IF;
    SELECT jsonb_agg(to_jsonb(h) ORDER BY h.id) INTO household_before FROM public.sales_household_members h WHERE h.membership_id=membership;
    -- Early renewal is rejected without creating any intent/invoice.
    UPDATE public.sales_memberships SET expires_at=current_date+60 WHERE id=membership;
    BEGIN
      PERFORM public.native_sales_patient_request_online_renewal(identity,membership,gen_random_uuid());
      RAISE EXCEPTION 'EARLY_RENEWAL_ACCEPTED';
    EXCEPTION WHEN SQLSTATE '22023' THEN IF SQLERRM<>'RENEWAL_NOT_ELIGIBLE' THEN RAISE; END IF; END;
    UPDATE public.sales_memberships SET expires_at=old_expiry WHERE id=membership;
    SELECT count(*) INTO before_contacts FROM public.sales_contacts WHERE organization_id=org;
    SELECT count(*) INTO before_leads FROM public.sales_leads WHERE organization_id=org;
    request_key:=gen_random_uuid();
    result:=public.native_sales_patient_request_online_renewal(identity,membership,request_key);
    renewal:=(result->>'id')::uuid;
    replay:=public.native_sales_patient_request_online_renewal(identity,membership,request_key);
    IF replay->>'id'<>renewal::text OR replay->>'replayed'<>'true' THEN RAISE EXCEPTION 'RENEWAL_RETRY_DUPLICATED'; END IF;
    replay:=public.native_sales_patient_request_online_renewal(identity,membership,gen_random_uuid());
    IF replay->>'id'<>renewal::text OR (SELECT count(*) FROM public.sales_contacts WHERE organization_id=org)<>before_contacts
      OR (SELECT count(*) FROM public.sales_leads WHERE organization_id=org)<>before_leads THEN RAISE EXCEPTION 'RENEWAL_RECREATED_IDENTITY'; END IF;
    SELECT * INTO renewal_quote FROM public.native_sales_renewal_quote('ESSENTIAL',term_type,'MONTHLY');
    IF renewal_quote.months<>1 OR renewal_quote.total_cents<>initial_quote.monthly_cents OR
      NOT public.native_sales_patient_invoice_agreement_valid(renewal) OR
      (SELECT count(*) FROM public.sales_patient_agreement_acceptances WHERE patient_identity_id=identity)<>1 THEN
      RAISE EXCEPTION 'RENEWAL_PRICE_OR_CONSENT_REUSE_FAILED'; END IF;
    BEGIN
      PERFORM public.native_sales_patient_complete_renewal(renewal);
      RAISE EXCEPTION 'UNPAID_RENEWAL_EXTENDED';
    EXCEPTION WHEN SQLSTATE '42501' THEN IF SQLERRM<>'RENEWAL_PAYMENT_NOT_VERIFIED' THEN RAISE; END IF; END;
    SELECT * INTO job FROM public.native_sales_qbo_claim_invoice(identity,renewal);
    PERFORM public.native_sales_qbo_claim_invoice(identity,renewal);
    IF (SELECT count(*) FROM public.sales_qbo_invoice_jobs WHERE enrollment_intent_id=renewal)<>1 THEN RAISE EXCEPTION 'DUPLICATE_INVOICE_JOB'; END IF;
    INSERT INTO public.sales_qbo_customer_bindings(organization_id,contact_id,qbo_customer_id) VALUES(org,contact,CASE term_type WHEN 'FAMILY' THEN '202' ELSE '201' END);
    -- Simulated provider response in this isolated transaction; never calls QBO.
    UPDATE public.sales_qbo_invoice_jobs SET state='INVOICE_CREATED',qbo_customer_id=CASE term_type WHEN 'FAMILY' THEN '202' ELSE '201' END,
      qbo_invoice_id=CASE term_type WHEN 'FAMILY' THEN '102' ELSE '101' END,qbo_invoice_number='CS-LOCAL-'||renewal::text WHERE id=job.id;
    q:=public.native_sales_qbo_finish_invoice(job.id,CASE term_type WHEN 'FAMILY' THEN '202' ELSE '201' END,'301',
      CASE term_type WHEN 'FAMILY' THEN '102' ELSE '101' END,'CS-LOCAL-'||renewal::text,'https://connect.intuit.com/t/local-renewal-not-real');
    IF (SELECT expires_at FROM public.sales_memberships WHERE id=membership)<>old_expiry THEN RAISE EXCEPTION 'PENDING_INVOICE_EXTENDED_COVERAGE'; END IF;
    q:=public.native_sales_patient_qbo_update(renewal,admin_member,'VERIFY_PAYMENT',
      p_payment_reference:='LOCAL-SIMULATED-'||renewal::text,p_payment_confirmed_at:=now());
    result:=public.native_sales_patient_complete_renewal(renewal);
    replay:=public.native_sales_patient_complete_renewal(renewal);
    SELECT jsonb_agg(to_jsonb(h) ORDER BY h.id) INTO household_after FROM public.sales_household_members h WHERE h.membership_id=membership;
    IF result->>'membershipId'<>membership::text OR result->>'code'<>old_code OR replay->>'replayed'<>'true'
      OR (result->>'expiresAt')::date<>public.native_sales_add_membership_months(old_expiry,1)
      OR (SELECT count(*) FROM public.sales_membership_periods WHERE membership_id=membership)<>2
      OR (SELECT seller_member_id FROM public.sales_memberships WHERE id=membership)<>seller
      OR household_before IS DISTINCT FROM household_after THEN RAISE EXCEPTION 'RENEWAL_IDENTITY_PERIOD_FAMILY_OR_REPLAY_REGRESSION'; END IF;
    BEGIN
      PERFORM public.native_sales_issue_membership(org,admin_member,q.sales_payment_id,contact,'ESSENTIAL',term_type,'MONTHLY',current_date,
        'QA','Renewal','555-0100','qa-renewal-'||lower(term_type)||'@example.invalid','QA address',false,
        'qa-invalid-second-member-'||renewal::text,repeat('e',64),gen_random_uuid());
      RAISE EXCEPTION 'RENEWAL_PAYMENT_CREATED_SECOND_MEMBERSHIP';
    EXCEPTION WHEN SQLSTATE '42501' THEN IF SQLERRM<>'RENEWAL_USE_VERIFIED_EXTENSION' THEN RAISE; END IF; END;
    expected_paid:=expected_paid+renewal_quote.total_cents;
    report:=public.native_sales_report_detail(org,admin_member,current_date,current_date);
    IF (report#>>'{renewals,paidCents}')::integer<>expected_paid THEN RAISE EXCEPTION 'RENEWAL_REPORT_NOT_COUNTED'; END IF;
    -- Expired membership starts at the verified payment date, not in the past.
    UPDATE public.sales_memberships SET expires_at=current_date-10 WHERE id=membership;
    result:=public.native_sales_patient_request_online_renewal(identity,membership,gen_random_uuid());
    cancelled:=(result->>'id')::uuid;
    PERFORM public.native_sales_patient_cancel_renewal(identity,cancelled);
    PERFORM public.native_sales_patient_cancel_renewal(identity,cancelled);
    IF (SELECT status FROM public.sales_patient_enrollment_intents WHERE id=cancelled)<>'CANCELLED'
      OR (SELECT expires_at FROM public.sales_memberships WHERE id=membership)<>current_date-10 THEN RAISE EXCEPTION 'UNBILLED_CANCELLATION_CHANGED_COVERAGE'; END IF;
    -- An invoiced unpaid renewal enters review; only supported void confirmation releases it.
    result:=public.native_sales_patient_request_online_renewal(identity,membership,gen_random_uuid());
    cancelled:=(result->>'id')::uuid;
    SELECT * INTO job FROM public.native_sales_qbo_claim_invoice(identity,cancelled);
    UPDATE public.sales_qbo_invoice_jobs SET state='INVOICE_CREATED',
      qbo_customer_id=CASE term_type WHEN 'FAMILY' THEN '202' ELSE '201' END,
      qbo_invoice_id=CASE term_type WHEN 'FAMILY' THEN '104' ELSE '103' END,
      qbo_invoice_number='CS-LOCAL-'||cancelled::text WHERE id=job.id;
    PERFORM public.native_sales_qbo_finish_invoice(job.id,CASE term_type WHEN 'FAMILY' THEN '202' ELSE '201' END,'301',
      CASE term_type WHEN 'FAMILY' THEN '104' ELSE '103' END,'CS-LOCAL-'||cancelled::text,'https://connect.intuit.com/t/local-cancel-not-real');
    result:=public.native_sales_patient_cancel_renewal(identity,cancelled);
    IF result->>'status'<>'CANCELLATION_REQUESTED' THEN RAISE EXCEPTION 'INVOICED_RENEWAL_NOT_HELD_FOR_VOID'; END IF;
    BEGIN
      PERFORM public.native_sales_patient_complete_renewal(cancelled);
      RAISE EXCEPTION 'CANCELLATION_REVIEW_EXTENDED_COVERAGE';
    EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
    PERFORM public.native_sales_patient_confirm_invoice_void(cancelled,admin_member,'CS-LOCAL-'||cancelled::text,
      'ISOLATED SIMULATED VOID EVIDENCE, NO PROVIDER CALL',gen_random_uuid());
    IF (SELECT status FROM public.sales_patient_enrollment_intents WHERE id=cancelled)<>'CANCELLED'
      OR (SELECT expires_at FROM public.sales_memberships WHERE id=membership)<>current_date-10 THEN
      RAISE EXCEPTION 'VOID_CANCELLATION_CHANGED_COVERAGE'; END IF;
    -- A later verified renewal on an expired member starts on payment date.
    UPDATE public.sales_memberships SET status='EXPIRED' WHERE id=membership;
    result:=public.native_sales_patient_request_online_renewal(identity,membership,gen_random_uuid());
    renewal:=(result->>'id')::uuid;
    SELECT * INTO job FROM public.native_sales_qbo_claim_invoice(identity,renewal);
    UPDATE public.sales_qbo_invoice_jobs SET state='INVOICE_CREATED',
      qbo_customer_id=CASE term_type WHEN 'FAMILY' THEN '202' ELSE '201' END,
      qbo_invoice_id=CASE term_type WHEN 'FAMILY' THEN '106' ELSE '105' END,
      qbo_invoice_number='CS-LOCAL-'||renewal::text WHERE id=job.id;
    PERFORM public.native_sales_qbo_finish_invoice(job.id,CASE term_type WHEN 'FAMILY' THEN '202' ELSE '201' END,'301',
      CASE term_type WHEN 'FAMILY' THEN '106' ELSE '105' END,'CS-LOCAL-'||renewal::text,'https://connect.intuit.com/t/local-expired-not-real');
    PERFORM public.native_sales_patient_qbo_update(renewal,admin_member,'VERIFY_PAYMENT',
      p_payment_reference:='LOCAL-SIMULATED-'||renewal::text,p_payment_confirmed_at:=now());
    result:=public.native_sales_patient_complete_renewal(renewal);
    IF (result->>'startsAt')::date<>current_date OR (result->>'expiresAt')::date<>public.native_sales_add_membership_months(current_date,1)
      OR (SELECT status FROM public.sales_memberships WHERE id=membership)<>'ACTIVE'
      OR (SELECT code FROM public.sales_memberships WHERE id=membership)<>old_code THEN RAISE EXCEPTION 'EXPIRED_RENEWAL_PERIOD_WRONG'; END IF;
    expected_paid:=expected_paid+renewal_quote.total_cents;
    BEGIN
      PERFORM public.native_sales_patient_request_online_renewal(gen_random_uuid(),membership,gen_random_uuid());
      RAISE EXCEPTION 'FOREIGN_PATIENT_RENEWAL_ALLOWED';
    EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
  END LOOP;
END;
$$;
ROLLBACK;
