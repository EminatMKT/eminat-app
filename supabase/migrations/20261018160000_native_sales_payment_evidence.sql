-- Staff-recorded SalesPayment evidence only. This function does not charge,
-- settle, or sync money and is not wired to QuickBooks or Stripe.
CREATE FUNCTION public.native_sales_record_payment_evidence(
  p_organization_id uuid, p_actor_member_id uuid, p_opportunity_id uuid,
  p_amount numeric(18,2), p_currency varchar(3), p_paid_at date,
  p_reference text, p_idempotency_key text, p_request_id uuid
) RETURNS public.sales_payments
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_actor public.sales_members%ROWTYPE;
DECLARE v_opportunity public.sales_opportunities%ROWTYPE;
DECLARE v_stage_outcome text;
DECLARE v_existing public.sales_payments%ROWTYPE;
DECLARE v_paid numeric(18,2);
DECLARE v_result public.sales_payments%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  IF p_opportunity_id IS NULL OR p_amount IS NULL OR p_amount<=0 OR p_currency IS NULL
    OR p_currency !~ '^[A-Z]{3}$' OR p_paid_at IS NULL OR p_request_id IS NULL
    OR length(coalesce(p_reference,''))>200 OR p_idempotency_key IS NULL
    OR p_idempotency_key !~ '^[A-Za-z0-9_-]{8,128}$' THEN
    RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE='22023';
  END IF;
  SELECT m.* INTO v_actor FROM public.sales_members m
    JOIN public.sales_organizations o ON o.id=m.organization_id
    WHERE m.organization_id=p_organization_id AND m.id=p_actor_member_id
      AND m.status='active' AND o.status='active';
  IF NOT FOUND OR v_actor.role NOT IN ('SUPERADMIN','ADMINISTRATOR') THEN
    RAISE EXCEPTION 'PAYMENT_CONFIRMATION_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  SELECT o.* INTO v_opportunity FROM public.sales_opportunities o
    WHERE o.organization_id=p_organization_id AND o.id=p_opportunity_id
      AND o.archived_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'OPPORTUNITY_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  SELECT * INTO v_existing FROM public.sales_payments
    WHERE organization_id=p_organization_id AND idempotency_key=p_idempotency_key;
  IF FOUND THEN
    IF v_existing.opportunity_id<>p_opportunity_id OR v_existing.amount<>p_amount
      OR v_existing.currency<>p_currency OR v_existing.paid_at<>p_paid_at
      OR v_existing.reference IS DISTINCT FROM nullif(btrim(p_reference),'') THEN
      RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE='23505';
    END IF;
    RETURN v_existing;
  END IF;
  SELECT outcome INTO v_stage_outcome FROM public.sales_stages
    WHERE organization_id=p_organization_id AND id=v_opportunity.stage_id;
  IF v_stage_outcome='LOST' THEN
    RAISE EXCEPTION 'PAYMENTS_DISABLED_FOR_LOST_OPPORTUNITY' USING ERRCODE='22023';
  END IF;
  IF v_opportunity.currency<>p_currency THEN
    RAISE EXCEPTION 'PAYMENT_CURRENCY_MISMATCH' USING ERRCODE='22023';
  END IF;
  IF v_opportunity.amount IS NULL OR v_opportunity.amount<=0 THEN
    RAISE EXCEPTION 'OPPORTUNITY_AMOUNT_REQUIRED' USING ERRCODE='22023';
  END IF;
  SELECT coalesce(sum(amount),0) INTO v_paid FROM public.sales_payments
    WHERE organization_id=p_organization_id AND opportunity_id=p_opportunity_id;
  IF p_amount>v_opportunity.amount-v_paid THEN
    RAISE EXCEPTION 'PAYMENT_EXCEEDS_REMAINING_BALANCE' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.sales_payments
    (organization_id,opportunity_id,owner_member_id,team_id,amount,currency,
     paid_at,reference,idempotency_key,created_by)
    VALUES (p_organization_id,p_opportunity_id,v_opportunity.owner_member_id,
      v_opportunity.team_id,p_amount,p_currency,p_paid_at,nullif(btrim(p_reference),''),
      p_idempotency_key,p_actor_member_id) RETURNING * INTO v_result;
  INSERT INTO public.sales_history
    (organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
    VALUES (p_organization_id,'payment',v_result.id,p_actor_member_id,'recorded',p_request_id,
      jsonb_build_object('opportunityId',p_opportunity_id,'amount',p_amount,'currency',p_currency));
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_record_payment_evidence(uuid,uuid,uuid,numeric,varchar,date,text,text,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_record_payment_evidence(uuid,uuid,uuid,numeric,varchar,date,text,text,uuid)
  TO service_role;
