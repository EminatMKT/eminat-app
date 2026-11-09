\set ON_ERROR_STOP on
-- Isolated CI rehearsal only. All synthetic records are rolled back.
BEGIN;
SET LOCAL request.jwt.claim.role='service_role';
DO $$
DECLARE a uuid:=gen_random_uuid(); u uuid:=gen_random_uuid(); o uuid:=gen_random_uuid();
DECLARE m uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); ac uuid:=gen_random_uuid();
DECLARE p uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); op uuid:=gen_random_uuid();
DECLARE pay uuid:=gen_random_uuid(); result jsonb; replay jsonb; quote record;
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
  BEGIN
    PERFORM public.native_sales_issue_membership(o,m,pay,c,'ESSENTIAL','INDIVIDUAL','MONTHLY',
      current_date,'QA','Opted Out','555-0100','qa-optout@example.invalid','QA address',false,
      'qa-optout-missing-payment',repeat('a',64),gen_random_uuid());
    RAISE EXCEPTION 'MISSING_PAYMENT_ACCEPTED';
  EXCEPTION WHEN SQLSTATE 'P0002' THEN NULL; END;
  INSERT INTO public.sales_payments(id,organization_id,opportunity_id,owner_member_id,amount,currency,paid_at,reference,idempotency_key,created_by,is_demo)
    VALUES (pay,o,op,m,quote.total_cents::numeric/100,'USD',current_date,
      'QA-LOCAL-PAYMENT-EVIDENCE','qa-email-preference-payment',m,false);
  result:=public.native_sales_issue_membership(o,m,pay,c,'ESSENTIAL','INDIVIDUAL','MONTHLY',
    current_date,'QA','Opted Out','555-0100','qa-optout@example.invalid','QA address',false,
    'qa-optout-membership',repeat('b',64),gen_random_uuid());
  IF result->>'status'<>'ACTIVE' OR (result->>'is_demo')::boolean THEN
    RAISE EXCEPTION 'OPTED_OUT_PAID_MEMBERSHIP_NOT_ACTIVE'; END IF;
  replay:=public.native_sales_issue_membership(o,m,pay,c,'ESSENTIAL','INDIVIDUAL','MONTHLY',
    current_date,'QA','Opted Out','555-0100','qa-optout@example.invalid','QA address',false,
    'qa-optout-membership',repeat('b',64),gen_random_uuid());
  IF replay->>'id'<>result->>'id' OR replay->>'replayed'<>'true'
    OR (SELECT count(*) FROM public.sales_memberships WHERE organization_id=o)<>1
    OR (SELECT count(*) FROM public.sales_history WHERE organization_id=o AND entity_type='membership' AND action='created')<>1
    OR NOT (SELECT do_not_email FROM public.sales_contacts WHERE id=c) THEN
    RAISE EXCEPTION 'OPT_OUT_REPLAY_OR_AUDIT_CHANGED'; END IF;
  BEGIN
    PERFORM public.native_sales_issue_membership(o,m,pay,c,'PLUS','INDIVIDUAL','MONTHLY',
      current_date,'QA','Opted Out','555-0100','qa-optout@example.invalid','QA address',false,
      'qa-optout-wrong-amount',repeat('c',64),gen_random_uuid());
    RAISE EXCEPTION 'WRONG_AMOUNT_ACCEPTED';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
END;
$$;
ROLLBACK;
