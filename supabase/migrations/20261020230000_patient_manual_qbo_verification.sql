-- Manual QuickBooks evidence for Patient Portal enrollments while OAuth is unavailable.
-- No existing patient, invoice, payment, or membership row is backfilled.
CREATE UNIQUE INDEX sales_patient_intent_organization_id_unique
  ON public.sales_patient_enrollment_intents(organization_id,id);
CREATE TABLE public.sales_patient_qbo_manual (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  enrollment_intent_id uuid NOT NULL,
  opportunity_id uuid NOT NULL,
  sales_payment_id uuid,
  integration_mode text NOT NULL DEFAULT 'MANUAL_QBO_VERIFICATION'
    CHECK (integration_mode = 'MANUAL_QBO_VERIFICATION'),
  verification_state text NOT NULL DEFAULT 'PENDING_INVOICE'
    CHECK (verification_state IN ('PENDING_INVOICE','INVOICE_CREATED','PAYMENT_PENDING',
      'PAYMENT_REPORTED','PAYMENT_VERIFIED','PAYMENT_REJECTED')),
  qbo_invoice_number text,
  qbo_invoice_reference text,
  qbo_customer_reference text,
  qbo_item_reference text,
  qbo_hosted_payment_url text,
  qbo_qr_reference text,
  qbo_invoice_status text NOT NULL DEFAULT 'NOT_CREATED'
    CHECK (qbo_invoice_status IN ('NOT_CREATED','OPEN','PAID','VOID','QA_SYNTHETIC')),
  qbo_payment_status text NOT NULL DEFAULT 'UNPAID'
    CHECK (qbo_payment_status IN ('UNPAID','REPORTED','PAID','VERIFIED','REJECTED')),
  qbo_payment_confirmed_at timestamptz,
  qbo_payment_verified_by uuid,
  qbo_payment_verified_at timestamptz,
  finance_verification_status text NOT NULL DEFAULT 'PENDING'
    CHECK (finance_verification_status IN ('PENDING','VERIFIED','REJECTED')),
  membership_activation_status text NOT NULL DEFAULT 'NOT_ACTIVE'
    CHECK (membership_activation_status IN ('NOT_ACTIVE','ACTIVE')),
  base_invoice_amount_cents integer NOT NULL CHECK (base_invoice_amount_cents > 0),
  qa_synthetic boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id,enrollment_intent_id)
    REFERENCES public.sales_patient_enrollment_intents(organization_id,id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id,opportunity_id)
    REFERENCES public.sales_opportunities(organization_id,id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id,sales_payment_id)
    REFERENCES public.sales_payments(organization_id,id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id,qbo_payment_verified_by)
    REFERENCES public.sales_members(organization_id,id) ON DELETE RESTRICT,
  UNIQUE (organization_id,enrollment_intent_id),
  UNIQUE (organization_id,opportunity_id),
  UNIQUE (organization_id,sales_payment_id),
  CHECK (qbo_invoice_number IS NULL OR length(btrim(qbo_invoice_number)) BETWEEN 1 AND 80),
  CHECK (qbo_invoice_number IS NULL OR
    (qa_synthetic AND qbo_invoice_number LIKE 'QA-%') OR
    (NOT qa_synthetic AND qbo_invoice_number NOT LIKE 'QA-%')),
  CHECK (qbo_invoice_reference IS NULL OR length(btrim(qbo_invoice_reference)) BETWEEN 1 AND 200),
  CHECK (qbo_customer_reference IS NULL OR length(btrim(qbo_customer_reference)) BETWEEN 1 AND 200),
  CHECK (qbo_item_reference IS NULL OR length(btrim(qbo_item_reference)) BETWEEN 1 AND 200),
  CHECK (qbo_qr_reference IS NULL OR length(btrim(qbo_qr_reference)) BETWEEN 1 AND 2048),
  CHECK (qbo_hosted_payment_url IS NULL OR
    (length(qbo_hosted_payment_url) <= 2048 AND
      qbo_hosted_payment_url ~ '^https://connect[.]intuit[.]com/t/[^[:space:]]+$')),
  CHECK (verification_state <> 'PAYMENT_VERIFIED' OR
    (finance_verification_status = 'VERIFIED' AND
      qbo_payment_status IN ('PAID','VERIFIED') AND
      qbo_payment_confirmed_at IS NOT NULL AND
      qbo_payment_verified_at IS NOT NULL AND
      qbo_payment_verified_by IS NOT NULL)),
  CHECK (membership_activation_status <> 'ACTIVE' OR verification_state = 'PAYMENT_VERIFIED')
);
CREATE INDEX sales_patient_qbo_manual_state_idx
  ON public.sales_patient_qbo_manual(organization_id,verification_state,created_at DESC);
CREATE UNIQUE INDEX sales_patient_qbo_manual_invoice_unique
  ON public.sales_patient_qbo_manual(organization_id,qbo_invoice_number)
  WHERE qbo_invoice_number IS NOT NULL;
ALTER TABLE public.sales_payments ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.sales_patient_qbo_manual ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sales_patient_qbo_manual FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.sales_patient_qbo_manual TO service_role;

-- Freddy's owner-approved EMC membership is pending to preserve Stratix access.
-- This narrow exception never grants general EMC Sales access.
CREATE FUNCTION public.native_sales_patient_qbo_owner(p_member_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT auth.role()='service_role' AND EXISTS (
    SELECT 1 FROM public.sales_members m JOIN public.usuarios u
      ON u.id=m.user_id AND u.auth_id=m.auth_id
    WHERE m.id=p_member_id AND m.organization_id='9efab353-46a0-43d1-9901-e3f185dc5d30'
      AND u.activo AND (
        (m.role='FINANCE' AND m.status='active') OR
        (m.id='c67e9779-9e87-48b0-9f6c-bf6a0c8cebad'
          AND m.user_id='2344e112-76ef-42a8-ac56-7c488084e0f5'
          AND m.role='SUPERADMIN' AND m.status='pending'
          AND m.evidence_ref='owner-approved-emc-patient-fallback-2026-10-20'))
  );
$$;
REVOKE ALL ON FUNCTION public.native_sales_patient_qbo_owner(uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_qbo_owner(uuid) TO service_role;

CREATE FUNCTION public.native_sales_patient_qbo_update(
  p_intent_id uuid,p_actor_member_id uuid,p_action text,
  p_invoice_number text DEFAULT NULL,p_invoice_reference text DEFAULT NULL,
  p_customer_reference text DEFAULT NULL,p_item_reference text DEFAULT NULL,
  p_invoice_amount_cents integer DEFAULT NULL,p_hosted_url text DEFAULT NULL,
  p_qr_reference text DEFAULT NULL,p_payment_reference text DEFAULT NULL,
  p_payment_confirmed_at timestamptz DEFAULT NULL,p_qa_synthetic boolean DEFAULT false
) RETURNS public.sales_patient_qbo_manual
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_intent public.sales_patient_enrollment_intents%ROWTYPE;
DECLARE v_opportunity public.sales_opportunities%ROWTYPE;
DECLARE v_qbo public.sales_patient_qbo_manual%ROWTYPE;
DECLARE v_payment public.sales_payments%ROWTYPE;
BEGIN
  IF NOT public.native_sales_patient_qbo_owner(p_actor_member_id) THEN
    RAISE EXCEPTION 'PATIENT_QBO_VERIFICATION_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  IF p_action NOT IN ('OPEN','RECORD_INVOICE','REPORT_PAYMENT','VERIFY_PAYMENT','REJECT_PAYMENT')
    OR p_intent_id IS NULL THEN
    RAISE EXCEPTION 'PATIENT_QBO_ACTION_INVALID' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_intent FROM public.sales_patient_enrollment_intents
    WHERE id=p_intent_id AND organization_id='9efab353-46a0-43d1-9901-e3f185dc5d30'
      AND opportunity_id IS NOT NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PATIENT_INTENT_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  SELECT * INTO v_opportunity FROM public.sales_opportunities
    WHERE organization_id=v_intent.organization_id AND id=v_intent.opportunity_id
      AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND OR v_opportunity.amount*100<>v_intent.amount_cents
    OR v_opportunity.currency<>'USD' THEN
    RAISE EXCEPTION 'PATIENT_OPPORTUNITY_AMOUNT_MISMATCH' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.sales_patient_qbo_manual
    (organization_id,enrollment_intent_id,opportunity_id,base_invoice_amount_cents,qa_synthetic)
  VALUES (v_intent.organization_id,v_intent.id,v_opportunity.id,v_intent.amount_cents,p_qa_synthetic)
  ON CONFLICT (organization_id,enrollment_intent_id) DO NOTHING;
  SELECT * INTO v_qbo FROM public.sales_patient_qbo_manual
    WHERE organization_id=v_intent.organization_id AND enrollment_intent_id=v_intent.id FOR UPDATE;
  IF v_qbo.qa_synthetic IS DISTINCT FROM p_qa_synthetic
    OR v_qbo.verification_state='PAYMENT_VERIFIED' AND p_action<>'OPEN' THEN
    RAISE EXCEPTION 'PATIENT_QBO_STATE_CONFLICT' USING ERRCODE='22023';
  END IF;
  IF p_action='RECORD_INVOICE' THEN
    IF length(btrim(coalesce(p_invoice_number,''))) NOT BETWEEN 1 AND 80
      OR (p_qa_synthetic AND p_invoice_number NOT LIKE 'QA-%')
      OR (NOT p_qa_synthetic AND p_invoice_number LIKE 'QA-%')
      OR p_invoice_amount_cents IS DISTINCT FROM v_intent.amount_cents THEN
      RAISE EXCEPTION 'PATIENT_QBO_INVOICE_INVALID' USING ERRCODE='22023';
    END IF;
    IF v_qbo.verification_state NOT IN
      ('PENDING_INVOICE','INVOICE_CREATED','PAYMENT_PENDING','PAYMENT_REJECTED') THEN
      RAISE EXCEPTION 'PATIENT_QBO_INVOICE_LOCKED' USING ERRCODE='22023';
    END IF;
    UPDATE public.sales_patient_qbo_manual SET
      qbo_invoice_number=btrim(p_invoice_number),
      qbo_invoice_reference=nullif(btrim(p_invoice_reference),''),
      qbo_customer_reference=nullif(btrim(p_customer_reference),''),
      qbo_item_reference=nullif(btrim(p_item_reference),''),
      qbo_hosted_payment_url=p_hosted_url,
      qbo_qr_reference=nullif(btrim(p_qr_reference),''),
      qbo_invoice_status=CASE WHEN p_qa_synthetic THEN 'QA_SYNTHETIC' ELSE 'OPEN' END,
      qbo_payment_status='UNPAID',
      finance_verification_status='PENDING',
      verification_state=CASE WHEN p_hosted_url IS NULL THEN 'INVOICE_CREATED'
        ELSE 'PAYMENT_PENDING' END,updated_at=now()
    WHERE id=v_qbo.id;
    UPDATE public.sales_patient_enrollment_intents SET status='PAYMENT_PENDING'
      WHERE id=v_intent.id AND status='PAYMENT_UNAVAILABLE';
  ELSIF p_action='REPORT_PAYMENT' THEN
    IF v_qbo.qbo_invoice_number IS NULL THEN
      RAISE EXCEPTION 'PATIENT_QBO_INVOICE_REQUIRED' USING ERRCODE='22023';
    END IF;
    UPDATE public.sales_patient_qbo_manual SET
      qbo_payment_status='REPORTED',verification_state='PAYMENT_REPORTED',updated_at=now()
    WHERE id=v_qbo.id;
  ELSIF p_action='REJECT_PAYMENT' THEN
    UPDATE public.sales_patient_qbo_manual SET
      qbo_payment_status='REJECTED',verification_state='PAYMENT_REJECTED',
      finance_verification_status='REJECTED',updated_at=now()
    WHERE id=v_qbo.id;
  ELSIF p_action='VERIFY_PAYMENT' THEN
    IF v_qbo.qbo_invoice_number IS NULL
      OR length(btrim(coalesce(p_payment_reference,''))) NOT BETWEEN 8 AND 200
      OR p_payment_confirmed_at IS NULL OR p_payment_confirmed_at>now()
      OR v_qbo.sales_payment_id IS NOT NULL THEN
      RAISE EXCEPTION 'PATIENT_QBO_PAYMENT_PROOF_REQUIRED' USING ERRCODE='22023';
    END IF;
    IF p_qa_synthetic AND p_payment_reference !~ '^QA_SYNTHETIC_' THEN
      RAISE EXCEPTION 'PATIENT_QBO_SYNTHETIC_REFERENCE_REQUIRED' USING ERRCODE='22023';
    END IF;
    INSERT INTO public.sales_payments
      (organization_id,opportunity_id,owner_member_id,team_id,amount,currency,
       paid_at,reference,idempotency_key,created_by,is_demo)
    VALUES (v_intent.organization_id,v_opportunity.id,v_opportunity.owner_member_id,
      v_opportunity.team_id,v_intent.amount_cents::numeric/100,'USD',
      (p_payment_confirmed_at AT TIME ZONE 'UTC')::date,btrim(p_payment_reference),
      'patient-qbo-'||v_intent.id::text,p_actor_member_id,p_qa_synthetic)
    RETURNING * INTO v_payment;
    UPDATE public.sales_patient_qbo_manual SET
      sales_payment_id=v_payment.id,qbo_payment_status='VERIFIED',
      qbo_invoice_status=CASE WHEN p_qa_synthetic THEN 'QA_SYNTHETIC' ELSE 'PAID' END,
      qbo_payment_confirmed_at=p_payment_confirmed_at,
      qbo_payment_verified_by=p_actor_member_id,qbo_payment_verified_at=now(),
      finance_verification_status='VERIFIED',verification_state='PAYMENT_VERIFIED',
      updated_at=now() WHERE id=v_qbo.id;
  END IF;
  SELECT * INTO v_qbo FROM public.sales_patient_qbo_manual WHERE id=v_qbo.id;
  INSERT INTO public.sales_history
    (organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
  VALUES (v_intent.organization_id,'patient_qbo',v_qbo.id,p_actor_member_id,
    lower(p_action),gen_random_uuid(),jsonb_build_object(
      'intentId',v_intent.id,'opportunityId',v_opportunity.id,
      'state',v_qbo.verification_state,'invoiceNumber',v_qbo.qbo_invoice_number,
      'paymentId',v_qbo.sales_payment_id,'qaSynthetic',v_qbo.qa_synthetic));
  RETURN v_qbo;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_patient_qbo_update(uuid,uuid,text,text,text,text,text,integer,text,text,text,timestamptz,boolean)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_qbo_update(uuid,uuid,text,text,text,text,text,integer,text,text,text,timestamptz,boolean)
  TO service_role;

-- The final database gate covers API calls, SQL functions and direct service writes.
CREATE FUNCTION public.native_sales_patient_qbo_membership_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,pg_temp AS $$
DECLARE v_intent public.sales_patient_enrollment_intents%ROWTYPE;
DECLARE v_qbo public.sales_patient_qbo_manual%ROWTYPE;
DECLARE v_verifier public.sales_members%ROWTYPE;
BEGIN
  IF NEW.status <> 'ACTIVE' THEN RETURN NEW; END IF;
  SELECT * INTO v_intent FROM public.sales_patient_enrollment_intents
    WHERE organization_id=NEW.organization_id AND opportunity_id=NEW.opportunity_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  SELECT * INTO v_qbo FROM public.sales_patient_qbo_manual
    WHERE organization_id=NEW.organization_id AND enrollment_intent_id=v_intent.id;
  IF NOT FOUND OR v_qbo.verification_state <> 'PAYMENT_VERIFIED'
    OR v_qbo.finance_verification_status <> 'VERIFIED'
    OR v_qbo.qbo_payment_status NOT IN ('PAID','VERIFIED')
    OR v_qbo.qbo_payment_verified_at IS NULL
    OR v_qbo.qbo_payment_confirmed_at IS NULL
    OR v_qbo.qbo_payment_verified_by IS NULL
    OR v_qbo.sales_payment_id IS DISTINCT FROM NEW.sales_payment_id
    OR NOT EXISTS (SELECT 1 FROM public.sales_payments p
      WHERE p.organization_id=NEW.organization_id AND p.id=NEW.sales_payment_id
        AND p.opportunity_id=NEW.opportunity_id AND p.is_demo=NEW.is_demo)
    OR v_qbo.base_invoice_amount_cents <> v_intent.amount_cents
    OR v_qbo.qa_synthetic IS DISTINCT FROM NEW.is_demo
    OR NEW.primary_contact_id IS DISTINCT FROM
      (SELECT i.contact_id FROM public.sales_patient_identities i
        WHERE i.organization_id=v_intent.organization_id AND i.id=v_intent.patient_identity_id)
  THEN RAISE EXCEPTION 'PATIENT_QBO_PAYMENT_NOT_VERIFIED' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_verifier FROM public.sales_members
    WHERE organization_id=NEW.organization_id AND id=v_qbo.qbo_payment_verified_by;
  IF NOT FOUND OR NOT (
    (v_verifier.role='FINANCE' AND v_verifier.status='active') OR
    (v_verifier.id='c67e9779-9e87-48b0-9f6c-bf6a0c8cebad'::uuid
      AND v_verifier.user_id='2344e112-76ef-42a8-ac56-7c488084e0f5'::uuid
      AND v_verifier.role='SUPERADMIN' AND v_verifier.status='pending'
      AND v_verifier.evidence_ref='owner-approved-emc-patient-fallback-2026-10-20')
  ) THEN RAISE EXCEPTION 'PATIENT_QBO_VERIFIER_FORBIDDEN' USING ERRCODE='42501'; END IF;
  IF NEW.created_by <> v_verifier.id
    OR NOT public.native_sales_patient_qbo_owner(v_verifier.id) THEN
    RAISE EXCEPTION 'PATIENT_QBO_ACTIVATION_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER sales_patient_qbo_membership_guard
  BEFORE INSERT OR UPDATE OF status,sales_payment_id,opportunity_id,is_demo
  ON public.sales_memberships FOR EACH ROW
  EXECUTE FUNCTION public.native_sales_patient_qbo_membership_guard();
REVOKE ALL ON FUNCTION public.native_sales_patient_qbo_membership_guard()
  FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.native_sales_patient_qbo_after_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_intent public.sales_patient_enrollment_intents%ROWTYPE;
DECLARE v_stage uuid;
DECLARE v_lead uuid;
BEGIN
  IF NEW.status<>'ACTIVE' THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' THEN
    IF OLD.status='ACTIVE' THEN RETURN NEW; END IF;
  END IF;
  SELECT * INTO v_intent FROM public.sales_patient_enrollment_intents
    WHERE organization_id=NEW.organization_id AND opportunity_id=NEW.opportunity_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  SELECT s.id INTO v_stage FROM public.sales_stages s
    JOIN public.sales_pipelines p ON p.organization_id=s.organization_id AND p.id=s.pipeline_id
    WHERE p.organization_id=NEW.organization_id AND p.code='PATIENT_ENROLLMENT'
      AND s.code='WON' AND p.active;
  IF v_stage IS NULL OR NOT EXISTS (SELECT 1 FROM public.sales_opportunities o
      JOIN public.sales_stages s ON s.organization_id=o.organization_id AND s.id=o.stage_id
      WHERE o.organization_id=NEW.organization_id AND o.id=NEW.opportunity_id
        AND s.code='PAYMENT_PENDING') THEN
    RAISE EXCEPTION 'PATIENT_OPPORTUNITY_NOT_PENDING' USING ERRCODE='22023';
  END IF;
  UPDATE public.sales_patient_qbo_manual SET membership_activation_status='ACTIVE',updated_at=now()
    WHERE organization_id=NEW.organization_id AND enrollment_intent_id=v_intent.id;
  UPDATE public.sales_patient_enrollment_intents SET membership_id=NEW.id,status='FULFILLED'
    WHERE id=v_intent.id;
  UPDATE public.sales_opportunities SET stage_id=v_stage,probability=100,
    actual_close_date=current_date,version=version+1,updated_by=NEW.created_by,updated_at=now()
    WHERE organization_id=NEW.organization_id AND id=NEW.opportunity_id;
  SELECT lead_id INTO v_lead FROM public.sales_patient_identities
    WHERE organization_id=v_intent.organization_id AND id=v_intent.patient_identity_id;
  IF v_lead IS NOT NULL THEN
    UPDATE public.sales_leads SET status='CONVERTED',converted_at=now(),
      converted_contact_id=NEW.primary_contact_id,converted_opportunity_id=NEW.opportunity_id,
      converted_account_id=(SELECT account_id FROM public.sales_opportunities
        WHERE organization_id=NEW.organization_id AND id=NEW.opportunity_id),
      version=version+1,updated_by=NEW.created_by,updated_at=now()
      WHERE organization_id=NEW.organization_id AND id=v_lead AND status<>'CONVERTED';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER sales_patient_qbo_after_membership
  AFTER INSERT OR UPDATE OF status ON public.sales_memberships FOR EACH ROW
  EXECUTE FUNCTION public.native_sales_patient_qbo_after_membership();
REVOKE ALL ON FUNCTION public.native_sales_patient_qbo_after_membership()
  FROM PUBLIC,anon,authenticated;

-- Only the approved EMC fallback may issue a Patient Portal membership.
-- All existing non-patient issuance rules remain in the original function.
CREATE OR REPLACE FUNCTION public.native_sales_issue_membership(
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
      AND (m.status='active' OR public.native_sales_patient_qbo_owner(m.id))
      AND o.status='active';
  IF NOT FOUND OR v_actor.role NOT IN ('SELLER','SALES_MANAGER','ADMINISTRATOR','SUPERADMIN','FINANCE')
    OR (v_actor.role='FINANCE' AND NOT public.native_sales_patient_qbo_owner(v_actor.id))
    OR (p_is_demo AND v_actor.role NOT IN ('SUPERADMIN','FINANCE')) THEN
    RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_quote FROM public.native_sales_membership_quote(p_plan,p_membership_type,p_duration);
  v_expires_at := public.native_sales_add_membership_months(p_issued_at,v_quote.initial_months);
  SELECT * INTO v_payment FROM public.sales_payments
    WHERE organization_id=p_organization_id AND id=p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PAYMENT_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  SELECT * INTO v_opportunity FROM public.sales_opportunities
    WHERE organization_id=p_organization_id AND id=v_payment.opportunity_id AND archived_at IS NULL;
  IF NOT FOUND OR (NOT public.native_sales_patient_qbo_owner(p_actor_member_id)
    AND NOT EXISTS (SELECT 1 FROM public.native_sales_visible_crm(
      p_organization_id,p_actor_member_id,'opportunities',1,0,NULL,v_payment.opportunity_id))) THEN
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
  IF NOT FOUND OR (NOT public.native_sales_patient_qbo_owner(p_actor_member_id)
    AND NOT EXISTS (SELECT 1 FROM public.native_sales_visible_crm(
      p_organization_id,p_actor_member_id,'contacts',1,0,NULL,p_contact_id))) THEN
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
  IF EXISTS (SELECT 1 FROM public.sales_patient_enrollment_intents i
      WHERE i.organization_id=p_organization_id AND i.opportunity_id=v_payment.opportunity_id)
    AND NOT public.native_sales_patient_qbo_owner(p_actor_member_id) THEN
    RAISE EXCEPTION 'PATIENT_QBO_ACTIVATION_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  IF v_payment.is_demo IS DISTINCT FROM p_is_demo THEN
    RAISE EXCEPTION 'PAYMENT_DEMO_MISMATCH' USING ERRCODE='22023';
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
  SELECT next_code.allocated_code_number,next_code.allocated_code INTO v_code_number,v_code
    FROM public.native_sales_next_membership_code() AS next_code;
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
  INSERT INTO public.sales_membership_code_registry
    (code,code_number,organization_id,membership_id)
    VALUES (v_code,v_code_number,p_organization_id,v_membership.id);
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
