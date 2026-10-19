-- Global membership-code uniqueness preserves the ANNIE 1725-nnnn format.
-- Imported historical codes must reconcile before paid issuance is enabled.
CREATE UNIQUE INDEX sales_memberships_global_code ON public.sales_memberships (code);

CREATE FUNCTION public.native_sales_add_membership_months(p_start date,p_months integer)
RETURNS date LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp AS $$
DECLARE v_month date;
DECLARE v_last_day integer;
BEGIN
  IF p_start IS NULL OR p_months NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'INVALID_MEMBERSHIP_DATE' USING ERRCODE='22023';
  END IF;
  v_month := (date_trunc('month',p_start)::date + make_interval(months=>p_months))::date;
  v_last_day := extract(day FROM (v_month + interval '1 month - 1 day'))::integer;
  RETURN v_month + (least(extract(day FROM p_start)::integer,v_last_day)-1);
END;
$$;

CREATE FUNCTION public.native_sales_issue_membership(
  p_organization_id uuid,p_actor_member_id uuid,p_payment_id uuid,p_contact_id uuid,
  p_plan text,p_membership_type text,p_duration text,p_issued_at date,
  p_first_name text,p_last_name text,p_phone text,p_email text,p_address text,
  p_is_demo boolean,p_idempotency_key text,p_payload_hash text,p_request_id uuid
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_actor public.sales_members%ROWTYPE;
DECLARE v_payment public.sales_payments%ROWTYPE;
DECLARE v_contact public.sales_contacts%ROWTYPE;
DECLARE v_opportunity public.sales_opportunities%ROWTYPE;
DECLARE v_quote record;
DECLARE v_operation public.sales_write_operations%ROWTYPE;
DECLARE v_existing public.sales_memberships%ROWTYPE;
DECLARE v_membership public.sales_memberships%ROWTYPE;
DECLARE v_code_number bigint;
DECLARE v_code text;
DECLARE v_expires_at date;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  IF p_payment_id IS NULL OR p_contact_id IS NULL OR p_issued_at IS NULL OR p_request_id IS NULL
    OR p_is_demo IS NULL OR p_first_name IS NULL OR length(btrim(p_first_name)) NOT BETWEEN 1 AND 160
    OR p_last_name IS NULL OR length(btrim(p_last_name)) NOT BETWEEN 1 AND 160
    OR p_phone IS NULL OR length(btrim(p_phone)) NOT BETWEEN 1 AND 80
    OR p_email IS NULL OR length(btrim(p_email)) NOT BETWEEN 1 AND 320
    OR p_address IS NULL OR length(btrim(p_address)) NOT BETWEEN 1 AND 1000
    OR p_idempotency_key IS NULL OR p_idempotency_key !~ '^[A-Za-z0-9_-]{8,128}$'
    OR p_payload_hash IS NULL OR p_payload_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE='22023';
  END IF;
  SELECT m.* INTO v_actor FROM public.sales_members m
    JOIN public.sales_organizations o ON o.id=m.organization_id
    WHERE m.organization_id=p_organization_id AND m.id=p_actor_member_id
      AND m.status='active' AND o.status='active';
  IF NOT FOUND OR v_actor.role NOT IN ('SELLER','SALES_MANAGER','ADMINISTRATOR','SUPERADMIN')
    OR (p_is_demo AND v_actor.role<>'SUPERADMIN') THEN
    RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_quote FROM public.native_sales_membership_quote(p_plan,p_membership_type,p_duration);
  v_expires_at := public.native_sales_add_membership_months(p_issued_at,v_quote.initial_months);
  SELECT * INTO v_payment FROM public.sales_payments
    WHERE organization_id=p_organization_id AND id=p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PAYMENT_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  SELECT * INTO v_opportunity FROM public.sales_opportunities
    WHERE organization_id=p_organization_id AND id=v_payment.opportunity_id AND archived_at IS NULL;
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM public.native_sales_visible_crm(
    p_organization_id,p_actor_member_id,'opportunities',1,0,NULL,v_payment.opportunity_id)) THEN
    RAISE EXCEPTION 'OPPORTUNITY_NOT_FOUND' USING ERRCODE='P0002';
  END IF;
  IF v_actor.role='SELLER' AND v_payment.owner_member_id<>p_actor_member_id THEN
    RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE='42501';
  END IF;
  IF v_actor.role='SALES_MANAGER' AND v_payment.owner_member_id<>p_actor_member_id
    AND NOT EXISTS (SELECT 1 FROM public.sales_team_members tm
      WHERE tm.organization_id=p_organization_id AND tm.member_id=p_actor_member_id
        AND tm.team_id=v_payment.team_id) THEN
    RAISE EXCEPTION 'TEAM_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_contact FROM public.sales_contacts
    WHERE organization_id=p_organization_id AND id=p_contact_id AND archived_at IS NULL;
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM public.native_sales_visible_crm(
    p_organization_id,p_actor_member_id,'contacts',1,0,NULL,p_contact_id)) THEN
    RAISE EXCEPTION 'CONTACT_NOT_FOUND' USING ERRCODE='P0002';
  END IF;
  IF v_contact.do_not_email AND NOT p_is_demo THEN
    RAISE EXCEPTION 'CONTACT_EMAIL_SUPPRESSED' USING ERRCODE='22023';
  END IF;
  IF v_opportunity.primary_contact_id IS DISTINCT FROM p_contact_id
    AND NOT EXISTS (SELECT 1 FROM public.sales_opportunity_contacts oc
      WHERE oc.organization_id=p_organization_id AND oc.opportunity_id=v_opportunity.id
        AND oc.contact_id=p_contact_id) THEN
    RAISE EXCEPTION 'CONTACT_OPPORTUNITY_MISMATCH' USING ERRCODE='22023';
  END IF;
  IF v_payment.currency<>'USD' OR v_payment.amount*100<>v_quote.total_cents
    OR v_payment.paid_at>current_date THEN
    RAISE EXCEPTION 'PAYMENT_DETAILS_MISMATCH' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.sales_write_operations
    (organization_id,actor_member_id,operation,idempotency_key,payload_hash)
    VALUES (p_organization_id,p_actor_member_id,'membership.issue',p_idempotency_key,p_payload_hash)
    ON CONFLICT (organization_id,actor_member_id,operation,idempotency_key) DO NOTHING;
  SELECT * INTO v_operation FROM public.sales_write_operations
    WHERE organization_id=p_organization_id AND actor_member_id=p_actor_member_id
      AND operation='membership.issue' AND idempotency_key=p_idempotency_key FOR UPDATE;
  IF v_operation.payload_hash<>p_payload_hash THEN
    RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE='23505';
  END IF;
  IF v_operation.record_id IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.sales_memberships
      WHERE organization_id=p_organization_id AND id=v_operation.record_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'OPERATION_INCOMPLETE' USING ERRCODE='P0001'; END IF;
    RETURN to_jsonb(v_existing) || jsonb_build_object('replayed',true);
  END IF;
  IF EXISTS (SELECT 1 FROM public.sales_memberships
    WHERE organization_id=p_organization_id AND sales_payment_id=p_payment_id) THEN
    RAISE EXCEPTION 'PAYMENT_ALREADY_USED_FOR_PRIMARY_MEMBERSHIP' USING ERRCODE='23505';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('lilly-sales-membership-code',0));
  SELECT coalesce(max(code_number),0)+1 INTO v_code_number FROM public.sales_memberships;
  v_code := '1725-' || lpad(v_code_number::text,4,'0');
  WHILE EXISTS (SELECT 1 FROM public.sales_memberships WHERE code=v_code) LOOP
    v_code_number:=v_code_number+1;
    v_code:='1725-' || lpad(v_code_number::text,4,'0');
  END LOOP;
  INSERT INTO public.sales_memberships
    (organization_id,code,code_number,primary_contact_id,opportunity_id,sales_payment_id,
     first_name,last_name,phone,email,address,membership_type,plan,duration,
     monthly_price_cents,total_price_cents,visit_fee_cents,included_visits,
     issued_at,expires_at,status,seller_member_id,team_id,sale_date,amount,currency,
     payment_reference,payment_confirmed_at,is_demo,created_by)
    VALUES (p_organization_id,v_code,v_code_number,p_contact_id,v_opportunity.id,p_payment_id,
      btrim(p_first_name),btrim(p_last_name),btrim(p_phone),btrim(p_email),btrim(p_address),
      p_membership_type,p_plan,p_duration,v_quote.monthly_cents,v_quote.total_cents,
      v_quote.visit_fee_cents,v_quote.included_visits,p_issued_at,v_expires_at,'ACTIVE',
      v_payment.owner_member_id,v_payment.team_id,v_payment.paid_at,v_payment.amount,
      v_payment.currency,v_payment.reference,now(),p_is_demo,p_actor_member_id)
    RETURNING * INTO v_membership;
  INSERT INTO public.sales_membership_periods
    (organization_id,membership_id,starts_at,expires_at,plan,duration,amount_cents)
    VALUES (p_organization_id,v_membership.id,p_issued_at,v_expires_at,p_plan,p_duration,
      v_quote.total_cents);
  INSERT INTO public.sales_household_members
    (organization_id,membership_id,contact_id,relationship,status,member_index,approved_by,approved_at)
    VALUES (p_organization_id,v_membership.id,p_contact_id,'PRIMARY','ACTIVE',1,
      p_actor_member_id,now());
  UPDATE public.sales_write_operations SET record_id=v_membership.id WHERE id=v_operation.id;
  INSERT INTO public.sales_history
    (organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
    VALUES (p_organization_id,'membership',v_membership.id,p_actor_member_id,'created',p_request_id,
      jsonb_build_object('paymentId',p_payment_id,'code',v_code,'plan',p_plan,
        'duration',p_duration,'type',p_membership_type));
  RETURN to_jsonb(v_membership) || jsonb_build_object('replayed',false);
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_add_membership_months(date,integer)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_add_membership_months(date,integer) TO service_role;
REVOKE ALL ON FUNCTION public.native_sales_issue_membership(uuid,uuid,uuid,uuid,text,text,text,date,text,text,text,text,text,boolean,text,text,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_issue_membership(uuid,uuid,uuid,uuid,text,text,text,date,text,text,text,text,text,boolean,text,text,uuid)
  TO service_role;
