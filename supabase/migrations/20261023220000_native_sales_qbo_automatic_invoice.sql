-- One immutable invoice attempt per current patient enrollment. An uncertain
-- provider write is held for reconciliation, never automatically repeated.
ALTER TABLE public.sales_patient_qbo_manual
  DROP CONSTRAINT sales_patient_qbo_manual_integration_mode_check;
ALTER TABLE public.sales_patient_qbo_manual
  ADD CONSTRAINT sales_patient_qbo_manual_integration_mode_check
  CHECK (integration_mode IN ('MANUAL_QBO_VERIFICATION','AUTO_QBO'));

CREATE TABLE public.sales_qbo_invoice_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  enrollment_intent_id uuid NOT NULL,
  patient_identity_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  opportunity_id uuid NOT NULL,
  plan text NOT NULL,
  membership_type text NOT NULL,
  duration text NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  state text NOT NULL DEFAULT 'CLAIMED' CHECK (state IN (
    'CLAIMED','PRECHECKING','CUSTOMER_WRITE_STARTED','CUSTOMER_LINKED',
    'INVOICE_WRITE_STARTED','INVOICE_CREATED','LINKED','NEEDS_REVIEW')),
  qbo_customer_id text,
  qbo_invoice_id text,
  qbo_invoice_number text,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id,enrollment_intent_id)
    REFERENCES public.sales_patient_enrollment_intents(organization_id,id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id,patient_identity_id)
    REFERENCES public.sales_patient_identities(organization_id,id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id,contact_id)
    REFERENCES public.sales_contacts(organization_id,id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id,opportunity_id)
    REFERENCES public.sales_opportunities(organization_id,id) ON DELETE RESTRICT,
  UNIQUE (organization_id,enrollment_intent_id),
  UNIQUE (organization_id,opportunity_id)
);
CREATE UNIQUE INDEX sales_qbo_invoice_jobs_invoice_id_unique
  ON public.sales_qbo_invoice_jobs(organization_id,qbo_invoice_id)
  WHERE qbo_invoice_id IS NOT NULL;

CREATE TABLE public.sales_qbo_invoice_job_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  job_id uuid NOT NULL REFERENCES public.sales_qbo_invoice_jobs(id) ON DELETE RESTRICT,
  previous_state text,
  next_state text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id,previous_state,next_state)
);
ALTER TABLE public.sales_qbo_invoice_job_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sales_qbo_invoice_job_events FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.sales_qbo_invoice_job_events TO service_role;
CREATE FUNCTION public.native_sales_qbo_invoice_job_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF TG_OP='INSERT' OR OLD.state IS DISTINCT FROM NEW.state THEN
    INSERT INTO public.sales_qbo_invoice_job_events
      (organization_id,job_id,previous_state,next_state)
    VALUES (NEW.organization_id,NEW.id,CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.state END,
      NEW.state)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER sales_qbo_invoice_job_audit AFTER INSERT OR UPDATE
  ON public.sales_qbo_invoice_jobs FOR EACH ROW
  EXECUTE FUNCTION public.native_sales_qbo_invoice_job_audit();
REVOKE ALL ON FUNCTION public.native_sales_qbo_invoice_job_audit()
  FROM PUBLIC,anon,authenticated;

CREATE TABLE public.sales_qbo_customer_bindings (
  organization_id uuid NOT NULL REFERENCES public.sales_organizations(id) ON DELETE RESTRICT,
  contact_id uuid NOT NULL,
  qbo_customer_id text NOT NULL CHECK (qbo_customer_id ~ '^[0-9]{1,80}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id,contact_id)
    REFERENCES public.sales_contacts(organization_id,id) ON DELETE RESTRICT,
  PRIMARY KEY (organization_id,contact_id),
  UNIQUE (organization_id,qbo_customer_id)
);

ALTER TABLE public.sales_qbo_invoice_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_qbo_customer_bindings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sales_qbo_invoice_jobs,public.sales_qbo_customer_bindings
  FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,UPDATE ON public.sales_qbo_invoice_jobs TO service_role;
GRANT SELECT,INSERT ON public.sales_qbo_customer_bindings TO service_role;

CREATE FUNCTION public.native_sales_qbo_claim_invoice(p_identity_id uuid,p_intent_id uuid)
RETURNS SETOF public.sales_qbo_invoice_jobs
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_intent public.sales_patient_enrollment_intents%ROWTYPE;
DECLARE v_identity public.sales_patient_identities%ROWTYPE;
DECLARE v_opportunity public.sales_opportunities%ROWTYPE;
BEGIN
  IF auth.role()<>'service_role' THEN
    RAISE EXCEPTION 'QBO_INVOICE_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_identity FROM public.sales_patient_identities
    WHERE id=p_identity_id AND organization_id='9efab353-46a0-43d1-9901-e3f185dc5d30';
  IF NOT FOUND THEN RAISE EXCEPTION 'PATIENT_IDENTITY_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  SELECT * INTO v_intent FROM public.sales_patient_enrollment_intents
    WHERE id=p_intent_id AND organization_id=v_identity.organization_id
      AND patient_identity_id=v_identity.id FOR UPDATE;
  IF NOT FOUND OR v_intent.status NOT IN ('PAYMENT_UNAVAILABLE','PAYMENT_PENDING')
    OR v_intent.membership_id IS NOT NULL OR v_intent.opportunity_id IS NULL
    OR v_intent.amount_cents<=0 THEN
    RAISE EXCEPTION 'PATIENT_INTENT_NOT_BILLABLE' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_opportunity FROM public.sales_opportunities
    WHERE id=v_intent.opportunity_id AND organization_id=v_intent.organization_id
      AND archived_at IS NULL;
  IF NOT FOUND OR v_opportunity.amount*100<>v_intent.amount_cents OR
    v_opportunity.currency<>'USD' THEN
    RAISE EXCEPTION 'PATIENT_OPPORTUNITY_MISMATCH' USING ERRCODE='22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.sales_patient_qbo_manual q
    WHERE q.organization_id=v_intent.organization_id AND
      (q.enrollment_intent_id=v_intent.id OR q.opportunity_id=v_intent.opportunity_id))
      AND NOT EXISTS (SELECT 1 FROM public.sales_qbo_invoice_jobs j
        WHERE j.organization_id=v_intent.organization_id AND j.enrollment_intent_id=v_intent.id
          AND j.state IN ('INVOICE_CREATED','LINKED')) THEN
    RAISE EXCEPTION 'PATIENT_INVOICE_ALREADY_LINKED' USING ERRCODE='23505';
  END IF;
  INSERT INTO public.sales_qbo_invoice_jobs
    (organization_id,enrollment_intent_id,patient_identity_id,contact_id,
     opportunity_id,plan,membership_type,duration,amount_cents)
  VALUES (v_intent.organization_id,v_intent.id,v_identity.id,v_identity.contact_id,
    v_intent.opportunity_id,v_intent.plan,v_intent.membership_type,
    v_intent.duration,v_intent.amount_cents)
  ON CONFLICT (organization_id,enrollment_intent_id) DO NOTHING;
  RETURN QUERY SELECT * FROM public.sales_qbo_invoice_jobs
    WHERE organization_id=v_intent.organization_id AND enrollment_intent_id=v_intent.id;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_qbo_claim_invoice(uuid,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_qbo_claim_invoice(uuid,uuid) TO service_role;

CREATE FUNCTION public.native_sales_qbo_finish_invoice(
  p_job_id uuid,p_customer_id text,p_item_id text,p_invoice_id text,
  p_invoice_number text,p_hosted_url text)
RETURNS public.sales_patient_qbo_manual
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_job public.sales_qbo_invoice_jobs%ROWTYPE;
DECLARE v_intent public.sales_patient_enrollment_intents%ROWTYPE;
DECLARE v_result public.sales_patient_qbo_manual%ROWTYPE;
BEGIN
  IF auth.role()<>'service_role' THEN
    RAISE EXCEPTION 'QBO_INVOICE_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_job FROM public.sales_qbo_invoice_jobs WHERE id=p_job_id FOR UPDATE;
  IF NOT FOUND OR v_job.state NOT IN ('INVOICE_CREATED','LINKED')
    OR p_customer_id !~ '^[0-9]{1,80}$' OR p_item_id !~ '^[0-9]{1,80}$'
    OR p_invoice_id !~ '^[0-9]{1,80}$'
    OR length(btrim(coalesce(p_invoice_number,''))) NOT BETWEEN 1 AND 80
    OR p_invoice_number LIKE 'QA-%' OR p_hosted_url IS NULL
    OR p_hosted_url !~ '^https://connect[.]intuit[.]com/t/[^[:space:]]+$'
    OR length(p_hosted_url)>2048 THEN
    RAISE EXCEPTION 'QBO_INVOICE_FINALIZE_INVALID' USING ERRCODE='22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sales_qbo_customer_bindings b WHERE
    b.organization_id=v_job.organization_id AND b.contact_id=v_job.contact_id
    AND b.qbo_customer_id=p_customer_id) THEN
    RAISE EXCEPTION 'QBO_CUSTOMER_BINDING_REQUIRED' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_intent FROM public.sales_patient_enrollment_intents
    WHERE id=v_job.enrollment_intent_id AND organization_id=v_job.organization_id FOR UPDATE;
  IF NOT FOUND OR v_intent.patient_identity_id<>v_job.patient_identity_id
    OR v_intent.opportunity_id<>v_job.opportunity_id
    OR v_intent.plan<>v_job.plan OR v_intent.membership_type<>v_job.membership_type
    OR v_intent.duration<>v_job.duration OR v_intent.amount_cents<>v_job.amount_cents
    OR v_intent.status NOT IN ('PAYMENT_UNAVAILABLE','PAYMENT_PENDING') THEN
    RAISE EXCEPTION 'QBO_INVOICE_SELECTION_CHANGED' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.sales_patient_qbo_manual
    (organization_id,enrollment_intent_id,opportunity_id,integration_mode,
     verification_state,qbo_invoice_number,qbo_invoice_reference,
     qbo_customer_reference,qbo_item_reference,qbo_hosted_payment_url,
     qbo_invoice_status,qbo_payment_status,base_invoice_amount_cents)
  VALUES (v_job.organization_id,v_job.enrollment_intent_id,v_job.opportunity_id,
    'AUTO_QBO','PAYMENT_PENDING',p_invoice_number,p_invoice_id,p_customer_id,
    p_item_id,p_hosted_url,'OPEN','UNPAID',v_job.amount_cents)
  ON CONFLICT (organization_id,enrollment_intent_id) DO NOTHING;
  SELECT * INTO v_result FROM public.sales_patient_qbo_manual
    WHERE organization_id=v_job.organization_id AND enrollment_intent_id=v_job.enrollment_intent_id;
  IF v_result.integration_mode<>'AUTO_QBO' OR v_result.qbo_invoice_reference<>p_invoice_id
    OR v_result.qbo_customer_reference<>p_customer_id
    OR v_result.qbo_hosted_payment_url<>p_hosted_url THEN
    RAISE EXCEPTION 'QBO_INVOICE_LINK_CONFLICT' USING ERRCODE='23505';
  END IF;
  UPDATE public.sales_patient_enrollment_intents SET status='PAYMENT_PENDING'
    WHERE id=v_job.enrollment_intent_id AND status='PAYMENT_UNAVAILABLE';
  UPDATE public.sales_qbo_invoice_jobs SET state='LINKED',
    qbo_customer_id=p_customer_id,qbo_invoice_id=p_invoice_id,
    qbo_invoice_number=p_invoice_number,updated_at=now() WHERE id=v_job.id;
  INSERT INTO public.sales_history
    (organization_id,entity_type,record_id,action,request_id,changes)
  SELECT v_job.organization_id,'PATIENT_QBO_INVOICE',v_job.enrollment_intent_id,
    'AUTO_INVOICE_LINKED',v_job.id,jsonb_build_object(
      'qbo_invoice_id',p_invoice_id,'qbo_invoice_number',p_invoice_number,
      'qbo_customer_id',p_customer_id,'opportunity_id',v_job.opportunity_id)
  WHERE NOT EXISTS (SELECT 1 FROM public.sales_history h WHERE
    h.organization_id=v_job.organization_id AND h.entity_type='PATIENT_QBO_INVOICE'
    AND h.record_id=v_job.enrollment_intent_id AND h.request_id=v_job.id);
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_qbo_finish_invoice(uuid,text,text,text,text,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_qbo_finish_invoice(uuid,text,text,text,text,text)
  TO service_role;

-- A selection cannot change while a provider write is underway or uncertain.
CREATE FUNCTION public.native_sales_qbo_invoice_selection_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF (OLD.plan,OLD.membership_type,OLD.duration,OLD.amount_cents,
      OLD.opportunity_id) IS DISTINCT FROM
     (NEW.plan,NEW.membership_type,NEW.duration,NEW.amount_cents,
      NEW.opportunity_id)
     OR (NEW.status IN ('CANCELLED','CHANGE_REQUESTED','CANCELLATION_REQUESTED')
       AND OLD.status IS DISTINCT FROM NEW.status) THEN
    IF EXISTS (SELECT 1 FROM public.sales_qbo_invoice_jobs j
      WHERE j.organization_id=OLD.organization_id AND j.enrollment_intent_id=OLD.id) THEN
      RAISE EXCEPTION 'PATIENT_PAYMENT_LOCKED' USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER sales_qbo_invoice_selection_guard BEFORE UPDATE
  ON public.sales_patient_enrollment_intents FOR EACH ROW
  EXECUTE FUNCTION public.native_sales_qbo_invoice_selection_guard();
REVOKE ALL ON FUNCTION public.native_sales_qbo_invoice_selection_guard()
  FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.native_sales_qbo_invoice_mapping_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF OLD.integration_mode='AUTO_QBO' AND
    (OLD.integration_mode,OLD.enrollment_intent_id,OLD.opportunity_id,
     OLD.qbo_invoice_reference,OLD.qbo_invoice_number,OLD.qbo_customer_reference,
     OLD.qbo_item_reference,OLD.base_invoice_amount_cents) IS DISTINCT FROM
    (NEW.integration_mode,NEW.enrollment_intent_id,NEW.opportunity_id,
     NEW.qbo_invoice_reference,NEW.qbo_invoice_number,NEW.qbo_customer_reference,
     NEW.qbo_item_reference,NEW.base_invoice_amount_cents) THEN
    RAISE EXCEPTION 'QBO_AUTO_INVOICE_IMMUTABLE' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER sales_qbo_invoice_mapping_guard BEFORE UPDATE
  ON public.sales_patient_qbo_manual FOR EACH ROW
  EXECUTE FUNCTION public.native_sales_qbo_invoice_mapping_guard();
REVOKE ALL ON FUNCTION public.native_sales_qbo_invoice_mapping_guard()
  FROM PUBLIC,anon,authenticated;
