\set ON_ERROR_STOP on
-- Isolated CI rehearsal only. All synthetic records are rolled back.
BEGIN;
SET LOCAL request.jwt.claim.role='service_role';
DO $$
DECLARE a uuid:=gen_random_uuid(); u uuid:=gen_random_uuid(); o uuid:=gen_random_uuid();
DECLARE m uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); ac uuid:=gen_random_uuid();
DECLARE p uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); op uuid:=gen_random_uuid();
DECLARE pay uuid:=gen_random_uuid(); result jsonb; quote record;
DECLARE l uuid:=gen_random_uuid(); seller_auth uuid:=gen_random_uuid(); seller_user uuid:=gen_random_uuid(); seller uuid:=gen_random_uuid();
BEGIN
  INSERT INTO auth.users(id) VALUES (a);
  INSERT INTO public.usuarios(id,auth_id,email,nombre,apellido,rol,validado,activo)
    VALUES (u,a,'qa-email-preference@example.invalid','QA','Email preference','admin',true,true);
  INSERT INTO public.sales_organizations(id,code,name,status,approved_by,approved_at)
    VALUES (o,'qa-email-preference','QA email preference','active',u,now());
  INSERT INTO public.sales_members(id,organization_id,user_id,auth_id,role,status,evidence_ref,approved_by,approved_at)
    VALUES (m,o,u,a,'SUPERADMIN','active','local-transaction-only',u,now());
  INSERT INTO public.sales_contacts(id,organization_id,owner_member_id,display_name,first_name,last_name,email,do_not_email,created_by,updated_by)
    VALUES (c,o,m,'QA Opted Out','QA','Opted Out','qa-optout@example.invalid',true,m,m);
  INSERT INTO public.sales_accounts(id,organization_id,owner_member_id,name,created_by,updated_by)
    VALUES (ac,o,m,'QA household',m,m);
  INSERT INTO public.sales_pipelines(id,organization_id,code,name) VALUES (p,o,'QA','QA');
  INSERT INTO public.sales_stages(id,organization_id,pipeline_id,code,name,position,probability,outcome)
    VALUES (s,o,p,'PAYMENT_PENDING','Pending',0,20,'OPEN');
  SELECT * INTO quote FROM public.native_sales_membership_quote('ESSENTIAL','INDIVIDUAL','MONTHLY');
  INSERT INTO public.sales_opportunities(id,organization_id,owner_member_id,name,account_id,primary_contact_id,stage_id,currency,amount,expected_close_date,created_by,updated_by)
    VALUES (op,o,m,'QA purchase',ac,c,s,'USD',quote.total_cents::numeric/100,current_date,m,m);

  INSERT INTO public.sales_leads(id,organization_id,owner_member_id,display_name,source,created_by,updated_by,created_at)
    VALUES(l,o,m,'Older lead','Manual',m,m,'2025-01-01T00:00:00Z');
  INSERT INTO auth.users(id) VALUES(seller_auth);
  INSERT INTO public.usuarios(id,auth_id,email,nombre,apellido,rol,validado,activo)
    VALUES(seller_user,seller_auth,'qa-report-seller@example.invalid','QA','Seller','admin',true,true);
  INSERT INTO public.sales_members(id,organization_id,user_id,auth_id,role,status,evidence_ref,approved_by,approved_at)
    VALUES(seller,o,seller_user,seller_auth,'SELLER','active','local-transaction-only',u,now());
  INSERT INTO public.sales_activities(organization_id,kind,title,actor_member_id,assignee_member_id,lead_id,contact_id,account_id,opportunity_id,created_at)
    VALUES
      (o,'FOLLOW_UP','Older lead, current follow-up',m,seller,l,NULL,NULL,NULL,'2026-10-15T00:00:00Z'),
      (o,'NOTE','Contact',m,NULL,NULL,c,NULL,NULL,'2026-10-15T00:00:00Z'),
      (o,'NOTE','Opportunity',m,NULL,NULL,NULL,NULL,op,'2026-10-15T00:00:00Z'),
      (o,'NOTE','Account',m,NULL,NULL,NULL,ac,NULL,'2026-10-15T00:00:00Z'),
      (o,'NOTE','Multiple parents counted once',m,NULL,l,c,ac,op,'2026-10-15T00:00:00Z'),
      (o,'TASK','General assigned task',m,seller,NULL,NULL,NULL,NULL,'2026-10-15T00:00:00Z'),
      (o,'NOTE','Before selected period',m,NULL,l,NULL,NULL,NULL,'2026-09-30T23:59:59Z'),
      (o,'NOTE','After selected period',m,NULL,NULL,c,NULL,NULL,'2026-11-01T00:00:00Z');
  result:=public.native_sales_report_detail(o,m,'2026-10-01','2026-10-31');
  IF (result#>>'{activities,total}')::int<>6 OR (result#>>'{activities,followUps}')::int<>1
    OR (result#>>'{leads,total}')::int<>0 THEN
    RAISE EXCEPTION 'ACTIVITY_REPORT_COHORT_OR_DOUBLE_COUNT_REGRESSION: %',result; END IF;
  result:=public.native_sales_report_detail(o,seller,'2026-10-01','2026-10-31');
  IF (result#>>'{activities,total}')::int<>1 THEN
    RAISE EXCEPTION 'SELLER_ACTIVITY_SCOPE_LEAK: %',result; END IF;
  IF (SELECT count(*) FROM public.native_sales_activity_inbox(o,seller,NULL,100,0) x
      WHERE (x->>'created_at')::timestamptz>='2026-10-01T00:00:00Z'
        AND (x->>'created_at')::timestamptz<'2026-11-01T00:00:00Z')<>1 THEN
    RAISE EXCEPTION 'REPORT_INBOX_SCOPE_MISMATCH'; END IF;
  BEGIN
    PERFORM public.native_sales_report_detail(gen_random_uuid(),m,'2026-10-01','2026-10-31');
    RAISE EXCEPTION 'CROSS_ORGANIZATION_REPORT_ALLOWED';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
END;
$$;
ROLLBACK;
