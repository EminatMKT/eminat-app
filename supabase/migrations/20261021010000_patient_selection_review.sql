-- Patient selection changes are atomic and service-only. Existing rows are not backfilled.
ALTER TABLE public.sales_patient_enrollment_intents
  DROP CONSTRAINT sales_patient_enrollment_intents_status_check;
ALTER TABLE public.sales_patient_enrollment_intents
  ADD CONSTRAINT sales_patient_enrollment_intents_status_check
  CHECK (status IN ('PAYMENT_UNAVAILABLE','PAYMENT_PENDING','CANCELLED','FULFILLED',
                   'CHANGE_REQUESTED','CANCELLATION_REQUESTED'));
CREATE UNIQUE INDEX sales_patient_one_pending_selection
  ON public.sales_patient_enrollment_intents(patient_identity_id)
  WHERE status IN ('PAYMENT_UNAVAILABLE','PAYMENT_PENDING','CHANGE_REQUESTED','CANCELLATION_REQUESTED');

CREATE TABLE public.sales_patient_selection_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_identity_id uuid NOT NULL,
  enrollment_intent_id uuid NOT NULL,
  request_key uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('CHANGE','CANCEL','CHANGE_REQUESTED','CANCELLATION_REQUESTED')),
  before_selection jsonb NOT NULL,
  after_selection jsonb,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id,patient_identity_id)
    REFERENCES public.sales_patient_identities(organization_id,id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id,enrollment_intent_id)
    REFERENCES public.sales_patient_enrollment_intents(organization_id,id) ON DELETE RESTRICT,
  UNIQUE (patient_identity_id,request_key)
);
CREATE INDEX sales_patient_selection_events_intent_idx
  ON public.sales_patient_selection_events(organization_id,enrollment_intent_id,created_at DESC);
ALTER TABLE public.sales_patient_selection_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sales_patient_selection_events FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.sales_patient_selection_events TO service_role;

CREATE FUNCTION public.native_sales_patient_selection_action(
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

-- A request freezes activation against the obsolete invoice until Finance resolves it.
CREATE FUNCTION public.native_sales_patient_selection_payment_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_review boolean;
BEGIN
  IF EXISTS (SELECT 1 FROM public.sales_patient_enrollment_intents i
    WHERE i.organization_id=NEW.organization_id AND i.id=NEW.enrollment_intent_id
      AND i.status='CANCELLED') THEN
    RAISE EXCEPTION 'PATIENT_SELECTION_CANCELLED' USING ERRCODE='42501';
  END IF;
  SELECT EXISTS (SELECT 1 FROM public.sales_patient_enrollment_intents i
    WHERE i.organization_id=NEW.organization_id AND i.id=NEW.enrollment_intent_id
      AND i.status IN ('CHANGE_REQUESTED','CANCELLATION_REQUESTED')) INTO v_review;
  IF v_review AND TG_OP='UPDATE' THEN
    IF NOT (OLD.qbo_invoice_status='OPEN' AND NEW.qbo_invoice_status='VOID'
      AND NEW.qbo_invoice_number IS NOT DISTINCT FROM OLD.qbo_invoice_number
      AND NEW.qbo_payment_status='REJECTED' AND NEW.verification_state='PAYMENT_REJECTED'
      AND NEW.qbo_hosted_payment_url IS NULL AND NEW.qbo_qr_reference IS NULL) THEN
      RAISE EXCEPTION 'PATIENT_SELECTION_REVIEW_PENDING' USING ERRCODE='42501';
    END IF;
  END IF;
  IF NEW.verification_state='PAYMENT_VERIFIED' AND
    EXISTS (SELECT 1 FROM public.sales_patient_enrollment_intents i
      WHERE i.organization_id=NEW.organization_id AND i.id=NEW.enrollment_intent_id
        AND i.status IN ('CHANGE_REQUESTED','CANCELLATION_REQUESTED','CANCELLED')) THEN
    RAISE EXCEPTION 'PATIENT_SELECTION_REVIEW_PENDING' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER sales_patient_selection_payment_guard
  BEFORE INSERT OR UPDATE ON public.sales_patient_qbo_manual
  FOR EACH ROW EXECUTE FUNCTION public.native_sales_patient_selection_payment_guard();
REVOKE ALL ON FUNCTION public.native_sales_patient_selection_payment_guard()
  FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.native_sales_patient_selection_activation_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF NEW.status='ACTIVE' AND EXISTS (
    SELECT 1 FROM public.sales_patient_enrollment_intents i
    WHERE i.organization_id=NEW.organization_id AND i.opportunity_id=NEW.opportunity_id
      AND i.status IN ('CHANGE_REQUESTED','CANCELLATION_REQUESTED','CANCELLED')) THEN
    RAISE EXCEPTION 'PATIENT_SELECTION_REVIEW_PENDING' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER sales_patient_selection_activation_guard
  BEFORE INSERT OR UPDATE OF status,opportunity_id ON public.sales_memberships
  FOR EACH ROW EXECUTE FUNCTION public.native_sales_patient_selection_activation_guard();
REVOKE ALL ON FUNCTION public.native_sales_patient_selection_activation_guard()
  FROM PUBLIC,anon,authenticated;

-- Records Finance's external QBO void confirmation; it does not call or change QuickBooks.
CREATE FUNCTION public.native_sales_patient_confirm_invoice_void(
  p_intent_id uuid,p_actor_member_id uuid,p_invoice_number text,p_evidence text,p_request_id uuid
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_intent public.sales_patient_enrollment_intents%ROWTYPE;
DECLARE v_qbo public.sales_patient_qbo_manual%ROWTYPE;
BEGIN
  IF NOT public.native_sales_patient_qbo_owner(p_actor_member_id) THEN
    RAISE EXCEPTION 'PATIENT_QBO_VOID_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  IF p_intent_id IS NULL OR p_request_id IS NULL OR
    length(btrim(coalesce(p_invoice_number,''))) NOT BETWEEN 1 AND 80 OR
    length(btrim(coalesce(p_evidence,''))) NOT BETWEEN 8 AND 500 THEN
    RAISE EXCEPTION 'PATIENT_QBO_VOID_EVIDENCE_REQUIRED' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_intent FROM public.sales_patient_enrollment_intents
    WHERE id=p_intent_id AND status IN ('CHANGE_REQUESTED','CANCELLATION_REQUESTED') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PATIENT_SELECTION_REVIEW_NOT_FOUND' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_qbo FROM public.sales_patient_qbo_manual
    WHERE organization_id=v_intent.organization_id AND enrollment_intent_id=v_intent.id FOR UPDATE;
  IF NOT FOUND OR v_qbo.qbo_invoice_number IS DISTINCT FROM btrim(p_invoice_number)
    OR v_qbo.qbo_invoice_status<>'OPEN' OR v_qbo.qbo_payment_status<>'UNPAID'
    OR v_qbo.finance_verification_status<>'PENDING' OR v_qbo.sales_payment_id IS NOT NULL THEN
    RAISE EXCEPTION 'PATIENT_QBO_INVOICE_NOT_VOIDABLE' USING ERRCODE='22023';
  END IF;
  UPDATE public.sales_patient_qbo_manual SET qbo_invoice_status='VOID',
    qbo_hosted_payment_url=NULL,qbo_qr_reference=NULL,
    verification_state='PAYMENT_REJECTED',qbo_payment_status='REJECTED',updated_at=now()
    WHERE id=v_qbo.id;
  INSERT INTO public.sales_history
    (organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
  VALUES (v_intent.organization_id,'patient_invoice',v_qbo.id,p_actor_member_id,
    'invoice_void_confirmed',p_request_id,
    jsonb_build_object('invoiceNumber',v_qbo.qbo_invoice_number,'evidence',btrim(p_evidence)));
  RETURN jsonb_build_object('intentId',v_intent.id,'invoiceStatus','VOID');
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_patient_confirm_invoice_void(uuid,uuid,text,text,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_confirm_invoice_void(uuid,uuid,text,text,uuid)
  TO service_role;
