\set ON_ERROR_STOP on
-- Synthetic identities only, against the new temporary cluster created by the runner.
BEGIN;
SET LOCAL request.jwt.claim.role='service_role';
DO $$
DECLARE a uuid:=gen_random_uuid();u uuid:=gen_random_uuid();org uuid:=gen_random_uuid();admin uuid:=gen_random_uuid();seller uuid:=gen_random_uuid();su uuid:=gen_random_uuid();sa uuid:=gen_random_uuid();
DECLARE c uuid;pa uuid;benefit uuid;member uuid;result jsonb;again jsonb;pl text;months integer;key uuid;h text;cnt integer:=0;forbidden boolean;
BEGIN
 INSERT INTO auth.users(id) VALUES(a),(sa);
 INSERT INTO public.usuarios(id,auth_id,email,nombre,apellido,rol,validado,activo) VALUES(u,a,'admin@example.invalid','QA','Admin','admin',true,true),(su,sa,'seller@example.invalid','QA','Seller','admin',true,true);
 INSERT INTO public.sales_organizations(id,code,name,status,approved_by,approved_at) VALUES(org,'qa-complimentary','QA Complimentary','active',u,now());
 INSERT INTO public.sales_members(id,organization_id,user_id,auth_id,role,status,evidence_ref,approved_by,approved_at)
 VALUES(admin,org,u,a,'SUPERADMIN','active','isolated-complimentary',u,now()),(seller,org,su,sa,'SELLER','active','isolated-complimentary',u,now());
 PERFORM public.native_sales_complimentary_configure(org,admin,'America/New_York',ARRAY[30,7,1],true);
 FOREACH pl IN ARRAY ARRAY['ESSENTIAL','PLUS','MAX'] LOOP
 FOREACH months IN ARRAY ARRAY[3,6,12] LOOP
  c:=gen_random_uuid();pa:=gen_random_uuid();key:=gen_random_uuid();h:=md5(key::text)||md5(key::text);
  INSERT INTO auth.users(id,email,email_confirmed_at) VALUES(pa,c::text||'@example.invalid',now());
  INSERT INTO public.sales_contacts(id,organization_id,owner_member_id,display_name,first_name,last_name,email,created_by,updated_by)
  VALUES(c,org,admin,'QA Courtesy','QA','Courtesy',c::text||'@example.invalid',admin,admin);
  result:=public.native_sales_complimentary_issue(org,admin,key,repeat('a',64),pl,months,'Community',c,'QA campaign','REDEMPTION_CODE',h,now()-interval '1 day',now()+interval '30 days');
  benefit:=(result->>'id')::uuid;
  again:=public.native_sales_complimentary_issue(org,admin,key,repeat('a',64),pl,months,'Community',c,'QA campaign','REDEMPTION_CODE',repeat('b',64),now()-interval '1 day',now()+interval '30 days');
  IF again->>'replayed'<>'true' OR (again->>'id')::uuid<>benefit THEN RAISE EXCEPTION 'ISSUE_NOT_IDEMPOTENT'; END IF;
  result:=public.native_sales_complimentary_redeem(org,pa,h,true);
  IF result->>'plan'<>pl OR (result->>'durationMonths')::integer<>months OR EXISTS(SELECT 1 FROM public.sales_patient_identities WHERE auth_id=pa) THEN RAISE EXCEPTION 'PREVIEW_MUTATED_IDENTITY'; END IF;
  result:=public.native_sales_complimentary_redeem(org,pa,h,false);
  member:=(result->>'membershipId')::uuid;
  IF NOT EXISTS(SELECT 1 FROM public.sales_memberships m JOIN public.sales_complimentary_benefits b ON b.membership_id=m.id
   WHERE m.id=member AND m.status='ACTIVE' AND m.funding_type='COMPLIMENTARY' AND m.sales_payment_id IS NULL AND m.amount=0
   AND m.expires_at=public.native_sales_add_membership_months((b.activated_at AT TIME ZONE b.timezone)::date,months)-1
   AND b.redeemed_by=pa AND b.beneficiary_contact_id=c) THEN RAISE EXCEPTION 'ACTIVATION_INVALID'; END IF;
  BEGIN
   PERFORM public.native_sales_complimentary_redeem(org,pa,h,false);RAISE EXCEPTION 'REUSE_ACCEPTED';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'COMPLIMENTARY_CODE_UNAVAILABLE' THEN RAISE; END IF; END;
  BEGIN
   UPDATE public.sales_memberships SET status='CANCELLED' WHERE id=member;
   RAISE EXCEPTION 'UNAUTHORIZED_BENEFIT_STATUS_CHANGE';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
   UPDATE public.sales_memberships SET plan=CASE WHEN pl='MAX' THEN 'PLUS' ELSE 'MAX' END WHERE id=member;
   RAISE EXCEPTION 'MEMBER_PLAN_MUTATION_ACCEPTED';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'COMPLIMENTARY_TERMS_IMMUTABLE' THEN RAISE; END IF; END;
  BEGIN
   UPDATE public.sales_memberships SET duration=CASE WHEN months=12 THEN '3M' ELSE '12M' END WHERE id=member;
   RAISE EXCEPTION 'MEMBER_DURATION_MUTATION_ACCEPTED';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'COMPLIMENTARY_TERMS_IMMUTABLE' THEN RAISE; END IF; END;
  IF months=3 THEN
   key:=gen_random_uuid();
   PERFORM public.native_sales_complimentary_action(org,admin,benefit,'EXTEND',3,'Extension',key);
   again:=public.native_sales_complimentary_action(org,admin,benefit,'EXTEND',3,'Extension',key);
   IF again->>'replayed'<>'true' OR (SELECT duration_months FROM public.sales_complimentary_benefits WHERE id=benefit)<>6 OR (SELECT count(*) FROM public.sales_membership_periods WHERE membership_id=member)<>2 THEN RAISE EXCEPTION 'EXTENSION_REPLAY_CHANGED_COVERAGE'; END IF;
   PERFORM public.native_sales_complimentary_action(org,admin,benefit,'SUSPEND',NULL,'Suspended');
   IF (SELECT status FROM public.sales_memberships WHERE id=member)<>'CANCELLED' THEN RAISE EXCEPTION 'SUSPENSION_NOT_ENFORCED'; END IF;
  END IF;
  cnt:=cnt+1;
 END LOOP; END LOOP;
 -- Existing member, direct activation and one-time account invitation binding.
 c:=gen_random_uuid();pa:=gen_random_uuid();
 INSERT INTO auth.users(id,email,email_confirmed_at) VALUES(pa,c::text||'@example.invalid',now());
 INSERT INTO public.sales_contacts(id,organization_id,owner_member_id,display_name,first_name,last_name,email,created_by,updated_by)
 VALUES(c,org,admin,'QA Direct','QA','Direct',c::text||'@example.invalid',admin,admin);
 result:=public.native_sales_complimentary_issue(org,admin,gen_random_uuid(),repeat('c',64),'MAX',5,'Authorized custom',c,NULL,'ADMIN_DIRECT',repeat('d',64),now()-interval '1 hour',now()+interval '30 days');
 benefit:=(result->>'id')::uuid;
 result:=public.native_sales_complimentary_redeem(org,pa,repeat('d',64),false);
 IF result->>'status'<>'ACTIVE' OR NOT EXISTS(SELECT 1 FROM public.sales_patient_identities WHERE auth_id=pa AND contact_id=c) THEN RAISE EXCEPTION 'INVITATION_NOT_LINKED'; END IF;
 BEGIN PERFORM public.native_sales_complimentary_redeem(org,pa,repeat('d',64),false);RAISE EXCEPTION 'INVITATION_REUSED';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'COMPLIMENTARY_CODE_UNAVAILABLE' THEN RAISE; END IF; END;
 -- A second code must not activate the same contact again.
 result:=public.native_sales_complimentary_issue(org,admin,gen_random_uuid(),repeat('e',64),'MAX',3,'Duplicate prevention',c,NULL,'REDEMPTION_CODE',repeat('e',64),now()-interval '1 hour',now()+interval '30 days');
 BEGIN PERFORM public.native_sales_complimentary_redeem(org,pa,repeat('e',64),false);RAISE EXCEPTION 'DUPLICATE_ACCEPTED';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'COMPLIMENTARY_ACCOUNT_REVIEW_REQUIRED' THEN RAISE; END IF; END;
 PERFORM public.native_sales_complimentary_action(org,admin,(result->>'id')::uuid,'REVOKE',NULL,'No longer eligible');
 BEGIN PERFORM public.native_sales_complimentary_redeem(org,pa,repeat('e',64),false);RAISE EXCEPTION 'REVOKED_ACCEPTED';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'COMPLIMENTARY_CODE_UNAVAILABLE' THEN RAISE; END IF; END;
 BEGIN PERFORM public.native_sales_complimentary_redeem(org,pa,repeat('0',64),false);RAISE EXCEPTION 'INVALID_ACCEPTED';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'COMPLIMENTARY_CODE_UNAVAILABLE' THEN RAISE; END IF; END;
 -- RBAC, tenant boundary and durable rate admission.
 BEGIN PERFORM public.native_sales_complimentary_configure(org,seller,'UTC',ARRAY[1],true);RAISE EXCEPTION 'SELLER_ACCEPTED';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM public.native_sales_complimentary_configure(gen_random_uuid(),admin,'UTC',ARRAY[1],true);RAISE EXCEPTION 'CROSS_TENANT_ACCEPTED';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 FOR cnt IN 1..10 LOOP IF NOT public.native_sales_complimentary_admit(repeat('a',64)) THEN RAISE EXCEPTION 'ADMISSION_EARLY'; END IF; END LOOP;
 IF public.native_sales_complimentary_admit(repeat('a',64)) THEN RAISE EXCEPTION 'RATE_LIMIT_NOT_ENFORCED'; END IF;
 IF EXISTS(SELECT 1 FROM public.sales_payments) OR EXISTS(SELECT 1 FROM public.sales_patient_enrollment_intents) OR EXISTS(SELECT 1 FROM public.sales_qbo_invoice_jobs) OR EXISTS(SELECT 1 FROM public.sales_patient_qbo_manual) THEN RAISE EXCEPTION 'COURTESY_CREATED_BILLING'; END IF;
 result:=public.native_sales_complimentary_list(org,admin,0,'','');
 IF result#>>'{rows,0,timezone}'<>'America/New_York' THEN RAISE EXCEPTION 'CAPTURED_TIMEZONE_MISSING'; END IF;
 IF (result#>>'{summary,totalMembers}')::integer<>10 OR (result#>>'{summary,generated}')::integer<>10 THEN RAISE EXCEPTION 'REPORT_INCORRECT %',result; END IF;
 result:=public.native_sales_report_detail(org,admin,current_date,current_date);
 IF (result#>>'{memberships,sold}')::integer<>0 THEN RAISE EXCEPTION 'COURTESY_COUNTED_AS_SALE'; END IF;
 IF public.native_sales_add_membership_months('2024-01-31',1)<>'2024-02-29' OR public.native_sales_add_membership_months('2024-02-29',12)<>'2025-02-28' THEN RAISE EXCEPTION 'CALENDAR_MONTH_REGRESSION'; END IF;
 -- Explicit future/expired-code checks after reporting baseline assertions.
 result:=public.native_sales_complimentary_issue(org,admin,gen_random_uuid(),repeat('f',64),'PLUS',3,'Expired code',c,NULL,'REDEMPTION_CODE',repeat('f',64),now()-interval '2 hours',now()+interval '1 day');
 UPDATE public.sales_complimentary_benefits SET redeem_before=now()-interval '1 hour' WHERE id=(result->>'id')::uuid;
 BEGIN PERFORM public.native_sales_complimentary_redeem(org,pa,repeat('f',64),true);RAISE EXCEPTION 'EXPIRED_CODE_ACCEPTED';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'COMPLIMENTARY_CODE_UNAVAILABLE' THEN RAISE; END IF; END;
 result:=public.native_sales_complimentary_issue(org,admin,gen_random_uuid(),repeat('0',64),'PLUS',3,'Future code',c,NULL,'REDEMPTION_CODE',repeat('0',64),now()+interval '1 day',now()+interval '2 days');
 BEGIN PERFORM public.native_sales_complimentary_redeem(org,pa,repeat('0',64),false);RAISE EXCEPTION 'FUTURE_CODE_ACCEPTED';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'COMPLIMENTARY_CODE_UNAVAILABLE' THEN RAISE; END IF; END;
 UPDATE public.sales_members SET role='ADMINISTRATOR' WHERE id=seller;
 BEGIN PERFORM public.native_sales_complimentary_issue(org,seller,gen_random_uuid(),repeat('0',64),'PLUS',5,'Unapproved custom',c,NULL,'REDEMPTION_CODE',repeat('1',64),now(),now()+interval '1 day');RAISE EXCEPTION 'CUSTOM_ADMIN_ACCEPTED';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 -- Configured notifications select only eligible recipients at the chosen threshold.
 PERFORM public.native_sales_complimentary_configure(org,admin,'America/New_York',ARRAY[(SELECT (expires_at AT TIME ZONE timezone)::date-(now() AT TIME ZONE timezone)::date FROM public.sales_complimentary_benefits WHERE id=benefit)],true);
 IF jsonb_array_length(public.native_sales_complimentary_due(org))<>1 THEN RAISE EXCEPTION 'NOTIFICATION_THRESHOLD_INCORRECT'; END IF;
 UPDATE public.sales_contacts SET do_not_email=true WHERE id=c;
 IF jsonb_array_length(public.native_sales_complimentary_due(org))<>0 THEN RAISE EXCEPTION 'EMAIL_SUPPRESSION_IGNORED'; END IF;
 PERFORM public.native_sales_complimentary_action(org,admin,benefit,'REVOKE',NULL,'Benefit ended');
 IF (SELECT status FROM public.sales_memberships WHERE id=(SELECT membership_id FROM public.sales_complimentary_benefits WHERE id=benefit))<>'CANCELLED' THEN RAISE EXCEPTION 'REVOKED_ACCESS_RETAINED'; END IF;
 RAISE NOTICE 'PASS nine plan/term combinations; custom direct activation; invitation; preview; identity reuse; duplicate/revoked/invalid codes; RBAC; tenant isolation; rate limit; no billing; reports; calendar dates';
END $$;
ROLLBACK;
