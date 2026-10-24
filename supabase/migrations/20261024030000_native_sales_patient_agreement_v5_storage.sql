-- Immutable consent for the exact owner-supplied v5 Patient Membership Agreement.
-- Existing invoice jobs remain recoverable; every new job requires consent for
-- the current enrollment terms before any QuickBooks write can start.
CREATE TABLE public.sales_patient_agreement_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_identity_id uuid NOT NULL,
  auth_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  enrollment_intent_id uuid NOT NULL,
  opportunity_id uuid NOT NULL,
  agreement_version text NOT NULL CHECK (agreement_version = 'v5'),
  agreement_date date NOT NULL CHECK (agreement_date = DATE '2026-09-21'),
  agreement_language text NOT NULL CHECK (agreement_language IN ('es','en')),
  document_sha256 text NOT NULL CHECK (document_sha256 ~ '^[0-9a-f]{64}$'),
  plan text NOT NULL,
  membership_type text NOT NULL,
  duration text NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  source text NOT NULL CHECK (source = 'PATIENT_PORTAL'),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id,patient_identity_id)
    REFERENCES public.sales_patient_identities(organization_id,id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id,contact_id)
    REFERENCES public.sales_contacts(organization_id,id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id,enrollment_intent_id)
    REFERENCES public.sales_patient_enrollment_intents(organization_id,id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id,opportunity_id)
    REFERENCES public.sales_opportunities(organization_id,id) ON DELETE RESTRICT,
  UNIQUE (organization_id,enrollment_intent_id,agreement_version,plan,
    membership_type,duration,amount_cents)
);
CREATE INDEX sales_patient_agreement_acceptances_identity_idx
  ON public.sales_patient_agreement_acceptances(organization_id,patient_identity_id,accepted_at DESC);
ALTER TABLE public.sales_patient_agreement_acceptances ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sales_patient_agreement_acceptances FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.sales_patient_agreement_acceptances TO service_role;

CREATE FUNCTION public.native_sales_patient_agreement_immutable()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'PATIENT_AGREEMENT_IMMUTABLE' USING ERRCODE='42501';
END;
$$;
CREATE TRIGGER sales_patient_agreement_immutable BEFORE UPDATE OR DELETE
  ON public.sales_patient_agreement_acceptances FOR EACH ROW
  EXECUTE FUNCTION public.native_sales_patient_agreement_immutable();
REVOKE ALL ON FUNCTION public.native_sales_patient_agreement_immutable()
  FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.native_sales_patient_accept_agreement(
  p_identity_id uuid,p_auth_id uuid,p_intent_id uuid,p_language text
) RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_identity public.sales_patient_identities%ROWTYPE;
DECLARE v_intent public.sales_patient_enrollment_intents%ROWTYPE;
DECLARE v_acceptance uuid;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' OR p_language NOT IN ('es','en') THEN
    RAISE EXCEPTION 'PATIENT_AGREEMENT_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_identity FROM public.sales_patient_identities
    WHERE id=p_identity_id AND auth_id=p_auth_id
      AND organization_id='9efab353-46a0-43d1-9901-e3f185dc5d30';
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM auth.users u
      WHERE u.id=p_auth_id AND u.email_confirmed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'PATIENT_AGREEMENT_IDENTITY_MISMATCH' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_intent FROM public.sales_patient_enrollment_intents
    WHERE id=p_intent_id AND organization_id=v_identity.organization_id
      AND patient_identity_id=v_identity.id FOR UPDATE;
  IF NOT FOUND OR v_intent.status NOT IN ('PAYMENT_UNAVAILABLE','PAYMENT_PENDING')
    OR v_intent.membership_id IS NOT NULL OR v_intent.opportunity_id IS NULL
    OR v_intent.amount_cents<=0 OR NOT EXISTS (
      SELECT 1 FROM public.sales_opportunities o
      WHERE o.id=v_intent.opportunity_id AND o.organization_id=v_intent.organization_id
        AND o.archived_at IS NULL AND o.amount*100=v_intent.amount_cents
        AND o.currency='USD') THEN
    RAISE EXCEPTION 'PATIENT_AGREEMENT_INTENT_NOT_BILLABLE' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.sales_patient_agreement_acceptances (
    organization_id,patient_identity_id,auth_id,contact_id,enrollment_intent_id,
    opportunity_id,agreement_version,agreement_date,agreement_language,
    document_sha256,plan,membership_type,duration,amount_cents,source
  ) VALUES (
    v_identity.organization_id,v_identity.id,p_auth_id,v_identity.contact_id,
    v_intent.id,v_intent.opportunity_id,'v5',DATE '2026-09-21',p_language,
    CASE p_language WHEN 'es' THEN
      '9d51e2dff719fec1e2773e389cda24e07d158d32ad284d886d19f832959a89c9'
    ELSE '0b98a0aed46c48e2a60d986ced55a56d679525890cdbbec065aef84e720dac16' END,
    v_intent.plan,v_intent.membership_type,v_intent.duration,v_intent.amount_cents,
    'PATIENT_PORTAL'
  ) ON CONFLICT (organization_id,enrollment_intent_id,agreement_version,plan,
      membership_type,duration,amount_cents) DO NOTHING RETURNING id INTO v_acceptance;
  IF v_acceptance IS NULL THEN
    SELECT id INTO v_acceptance FROM public.sales_patient_agreement_acceptances
      WHERE organization_id=v_intent.organization_id AND enrollment_intent_id=v_intent.id
        AND agreement_version='v5' AND plan=v_intent.plan
        AND membership_type=v_intent.membership_type AND duration=v_intent.duration
        AND amount_cents=v_intent.amount_cents;
  END IF;
  RETURN v_acceptance;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_patient_accept_agreement(uuid,uuid,uuid,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_accept_agreement(uuid,uuid,uuid,text)
  TO service_role;

