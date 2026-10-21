-- Allow a patient to cancel an unbilled, unlinked pre-trigger selection through
-- the normal Portal action. No payment, membership or historical row is modified.
CREATE OR REPLACE FUNCTION public.native_sales_patient_selection_action(
  p_identity_id uuid,p_action text,p_plan text,p_type text,p_duration text,p_request_key uuid
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_identity public.sales_patient_identities%ROWTYPE;
DECLARE v_intent public.sales_patient_enrollment_intents%ROWTYPE;
DECLARE v_qbo public.sales_patient_qbo_manual%ROWTYPE;
DECLARE v_opportunity public.sales_opportunities%ROWTYPE;
DECLARE v_stage public.sales_stages%ROWTYPE;
DECLARE v_quote record;
DECLARE v_result jsonb;
DECLARE v_before jsonb;
DECLARE v_after jsonb;
DECLARE v_event_action text;
DECLARE v_new_id uuid;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'PATIENT_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  IF p_identity_id IS NULL OR p_request_key IS NULL OR p_action NOT IN ('CHANGE','CANCEL') THEN
    RAISE EXCEPTION 'PATIENT_SELECTION_INVALID' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_identity FROM public.sales_patient_identities
    WHERE id=p_identity_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PATIENT_IDENTITY_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  SELECT result INTO v_result FROM public.sales_patient_selection_events
    WHERE patient_identity_id=p_identity_id AND request_key=p_request_key;
  IF FOUND THEN RETURN v_result; END IF;
  IF EXISTS (SELECT 1 FROM public.sales_memberships
      WHERE organization_id=v_identity.organization_id
        AND primary_contact_id=v_identity.contact_id AND status='ACTIVE') THEN
    RAISE EXCEPTION 'PATIENT_MEMBERSHIP_ACTIVE' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_intent FROM public.sales_patient_enrollment_intents
    WHERE organization_id=v_identity.organization_id AND patient_identity_id=p_identity_id
      AND status<>'CANCELLED'
    ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND OR v_intent.status='FULFILLED' THEN
    RAISE EXCEPTION 'PATIENT_SELECTION_NOT_PENDING' USING ERRCODE='22023';
  END IF;
  -- Legacy QA selections created before the Opportunity trigger can be cancelled
  -- by their bound patient only when they have no invoice, payment or membership.
  -- This is a normal cancellation with an audit event, not an activation/backfill.
  IF v_intent.opportunity_id IS NULL THEN
    IF p_action='CANCEL' AND v_intent.status='PAYMENT_UNAVAILABLE'
      AND v_intent.membership_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM public.sales_patient_qbo_manual
        WHERE organization_id=v_intent.organization_id
          AND enrollment_intent_id=v_intent.id) THEN
      v_before:=jsonb_build_object('plan',v_intent.plan,'type',v_intent.membership_type,
        'duration',v_intent.duration,'amountCents',v_intent.amount_cents,
        'status',v_intent.status,'invoiceNumber',NULL);
      UPDATE public.sales_patient_enrollment_intents SET status='CANCELLED'
        WHERE id=v_intent.id;
      v_result:=jsonb_build_object('status','CANCELLED','intentId',v_intent.id);
      INSERT INTO public.sales_patient_selection_events
        (organization_id,patient_identity_id,enrollment_intent_id,request_key,action,
         before_selection,after_selection,result)
      VALUES (v_intent.organization_id,p_identity_id,v_intent.id,p_request_key,'CANCEL',
        v_before,NULL,v_result);
      RETURN v_result;
    END IF;
    RAISE EXCEPTION 'PATIENT_OPPORTUNITY_NOT_PENDING' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_opportunity FROM public.sales_opportunities
    WHERE organization_id=v_intent.organization_id AND id=v_intent.opportunity_id FOR UPDATE;
  IF NOT FOUND OR v_opportunity.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'PATIENT_OPPORTUNITY_NOT_PENDING' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_qbo FROM public.sales_patient_qbo_manual
    WHERE organization_id=v_intent.organization_id AND enrollment_intent_id=v_intent.id FOR UPDATE;
  IF FOUND AND (v_qbo.verification_state IN ('PAYMENT_REPORTED','PAYMENT_VERIFIED')
      OR v_qbo.qbo_payment_status IN ('PAID','VERIFIED','REPORTED')) THEN
    RAISE EXCEPTION 'PATIENT_PAYMENT_LOCKED' USING ERRCODE='22023';
  END IF;
  v_before:=jsonb_build_object('plan',v_intent.plan,'type',v_intent.membership_type,
    'duration',v_intent.duration,'amountCents',v_intent.amount_cents,'status',v_intent.status,
    'invoiceNumber',v_qbo.qbo_invoice_number);
  IF p_action='CHANGE' THEN
    IF p_plan NOT IN ('ESSENTIAL','PLUS','MAX') OR p_type NOT IN ('INDIVIDUAL','FAMILY')
      OR p_duration NOT IN ('MONTHLY','3M','6M','12M') THEN
      RAISE EXCEPTION 'PATIENT_SELECTION_INVALID' USING ERRCODE='22023';
    END IF;
    SELECT * INTO v_quote FROM public.native_sales_membership_quote(p_plan,p_type,p_duration);
    IF NOT FOUND THEN RAISE EXCEPTION 'PATIENT_QUOTE_UNAVAILABLE' USING ERRCODE='22023'; END IF;
    v_after:=jsonb_build_object('plan',p_plan,'type',p_type,
      'duration',p_duration,'amountCents',v_quote.total_cents);
  END IF;
  IF v_qbo.qbo_invoice_number IS NOT NULL AND v_qbo.qbo_invoice_status<>'VOID' THEN
    IF v_intent.status IN ('CHANGE_REQUESTED','CANCELLATION_REQUESTED') THEN
      RAISE EXCEPTION 'PATIENT_SELECTION_REVIEW_PENDING' USING ERRCODE='22023';
    END IF;
    v_event_action:=CASE p_action WHEN 'CHANGE' THEN 'CHANGE_REQUESTED' ELSE 'CANCELLATION_REQUESTED' END;
    UPDATE public.sales_patient_enrollment_intents SET status=v_event_action WHERE id=v_intent.id;
    v_result:=jsonb_build_object('status',v_event_action,'intentId',v_intent.id);
  ELSIF p_action='CANCEL' THEN
    IF v_qbo.qbo_invoice_number IS NOT NULL AND v_qbo.qbo_invoice_status<>'VOID' THEN
      RAISE EXCEPTION 'PATIENT_INVOICE_STILL_OPEN' USING ERRCODE='22023';
    END IF;
    SELECT s.* INTO v_stage FROM public.sales_stages s
      JOIN public.sales_pipelines p ON p.organization_id=s.organization_id AND p.id=s.pipeline_id
      WHERE s.organization_id=v_intent.organization_id AND p.code='PATIENT_ENROLLMENT' AND s.code='LOST';
    IF NOT FOUND THEN RAISE EXCEPTION 'PATIENT_STAGE_UNAVAILABLE'; END IF;
    UPDATE public.sales_patient_enrollment_intents SET status='CANCELLED' WHERE id=v_intent.id;
    UPDATE public.sales_opportunities SET stage_id=v_stage.id,probability=0,
      lost_reason='Patient cancelled before payment',version=version+1,
      updated_by=owner_member_id,updated_at=now() WHERE id=v_opportunity.id;
    v_event_action:='CANCEL';
    v_result:=jsonb_build_object('status','CANCELLED','intentId',v_intent.id);
  ELSIF v_qbo.qbo_invoice_number IS NOT NULL AND v_qbo.qbo_invoice_status='VOID' THEN
    SELECT s.* INTO v_stage FROM public.sales_stages s
      JOIN public.sales_pipelines p ON p.organization_id=s.organization_id AND p.id=s.pipeline_id
      WHERE s.organization_id=v_intent.organization_id AND p.code='PATIENT_ENROLLMENT' AND s.code='LOST';
    IF NOT FOUND THEN RAISE EXCEPTION 'PATIENT_STAGE_UNAVAILABLE'; END IF;
    UPDATE public.sales_patient_enrollment_intents SET status='CANCELLED' WHERE id=v_intent.id;
    UPDATE public.sales_opportunities SET stage_id=v_stage.id,probability=0,
      lost_reason='Invoice voided; patient changed selection',version=version+1,
      updated_by=owner_member_id,updated_at=now() WHERE id=v_opportunity.id;
    INSERT INTO public.sales_patient_enrollment_intents
      (organization_id,patient_identity_id,plan,membership_type,duration,
       initial_months,amount_cents,status,idempotency_key)
    VALUES (v_intent.organization_id,p_identity_id,p_plan,p_type,p_duration,
      v_quote.initial_months,v_quote.total_cents,'PAYMENT_UNAVAILABLE',p_request_key)
    RETURNING id INTO v_new_id;
    v_event_action:='CHANGE';
    v_result:=jsonb_build_object('status','PAYMENT_UNAVAILABLE','intentId',v_new_id);
  ELSE
    UPDATE public.sales_patient_enrollment_intents SET
      plan=p_plan,membership_type=p_type,duration=p_duration,
      initial_months=v_quote.initial_months,amount_cents=v_quote.total_cents,
      status='PAYMENT_UNAVAILABLE' WHERE id=v_intent.id;
    UPDATE public.sales_opportunities SET amount=v_quote.total_cents::numeric/100,
      description='Plan: '||p_plan||'; Type: '||p_type||'; Modality: '||p_duration,
      version=version+1,updated_by=owner_member_id,updated_at=now()
      WHERE id=v_opportunity.id;
    IF v_qbo.id IS NOT NULL THEN
      UPDATE public.sales_patient_qbo_manual SET base_invoice_amount_cents=v_quote.total_cents,
        updated_at=now() WHERE id=v_qbo.id;
    END IF;
    v_event_action:='CHANGE';
    v_result:=jsonb_build_object('status','PAYMENT_UNAVAILABLE','intentId',v_intent.id);
  END IF;
  INSERT INTO public.sales_patient_selection_events
    (organization_id,patient_identity_id,enrollment_intent_id,request_key,action,
     before_selection,after_selection,result)
  VALUES (v_intent.organization_id,p_identity_id,v_intent.id,p_request_key,v_event_action,
    v_before,v_after,v_result);
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_patient_selection_action(uuid,text,text,text,text,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_selection_action(uuid,text,text,text,text,uuid)
  TO service_role;
