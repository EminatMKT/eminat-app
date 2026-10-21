-- Family members may be prepared while an enrollment is awaiting its invoice.
-- These rows are not covered household members and never receive a code or
-- activate a membership. Existing contacts and memberships are untouched.

-- Keep selection, pricing and its one Opportunity in one database transaction.
-- A missing/disabled Opportunity trigger now aborts the selection instead of
-- leaving another orphan intent behind.
CREATE FUNCTION public.native_sales_patient_enroll(
  p_identity_id uuid,p_plan text,p_type text,p_duration text,p_request_key uuid
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=public,pg_temp AS $$
DECLARE v_identity public.sales_patient_identities%ROWTYPE;
DECLARE v_existing public.sales_patient_enrollment_intents%ROWTYPE;
DECLARE v_intent public.sales_patient_enrollment_intents%ROWTYPE;
DECLARE v_quote record;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'PATIENT_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  IF p_identity_id IS NULL OR p_request_key IS NULL
    OR p_plan IS NULL OR p_plan NOT IN ('ESSENTIAL','PLUS','MAX')
    OR p_type IS NULL OR p_type NOT IN ('INDIVIDUAL','FAMILY')
    OR p_duration IS NULL OR p_duration NOT IN ('MONTHLY','3M','6M','12M') THEN
    RAISE EXCEPTION 'PATIENT_SELECTION_INVALID' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_identity FROM public.sales_patient_identities
    WHERE id=p_identity_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PATIENT_IDENTITY_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  SELECT * INTO v_existing FROM public.sales_patient_enrollment_intents
    WHERE patient_identity_id=p_identity_id AND idempotency_key=p_request_key;
  IF FOUND THEN
    IF v_existing.plan<>p_plan OR v_existing.membership_type<>p_type
      OR v_existing.duration<>p_duration THEN
      RAISE EXCEPTION 'PATIENT_IDEMPOTENCY_CONFLICT' USING ERRCODE='22023';
    END IF;
    IF v_existing.opportunity_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.sales_opportunities o
      WHERE o.organization_id=v_existing.organization_id
        AND o.id=v_existing.opportunity_id AND o.archived_at IS NULL) THEN
      RAISE EXCEPTION 'PATIENT_OPPORTUNITY_NOT_CREATED' USING ERRCODE='22023';
    END IF;
    RETURN jsonb_build_object('id',v_existing.id,'status',v_existing.status,
      'amount_cents',v_existing.amount_cents,'initial_months',v_existing.initial_months,
      'opportunity_id',v_existing.opportunity_id);
  END IF;
  IF EXISTS (SELECT 1 FROM public.sales_memberships
    WHERE organization_id=v_identity.organization_id
      AND primary_contact_id=v_identity.contact_id AND status='ACTIVE') THEN
    RAISE EXCEPTION 'PATIENT_MEMBERSHIP_ACTIVE' USING ERRCODE='22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.sales_patient_enrollment_intents
    WHERE patient_identity_id=p_identity_id
      AND status IN ('PAYMENT_UNAVAILABLE','PAYMENT_PENDING',
        'CHANGE_REQUESTED','CANCELLATION_REQUESTED')) THEN
    RAISE EXCEPTION 'PATIENT_SELECTION_ALREADY_EXISTS' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_quote FROM public.native_sales_membership_quote(p_plan,p_type,p_duration);
  IF NOT FOUND THEN RAISE EXCEPTION 'PATIENT_QUOTE_UNAVAILABLE' USING ERRCODE='22023'; END IF;
  INSERT INTO public.sales_patient_enrollment_intents
    (organization_id,patient_identity_id,plan,membership_type,duration,
     initial_months,amount_cents,idempotency_key,status)
  VALUES (v_identity.organization_id,p_identity_id,p_plan,p_type,p_duration,
    v_quote.initial_months,v_quote.total_cents,p_request_key,'PAYMENT_UNAVAILABLE')
  RETURNING * INTO v_intent;
  -- The AFTER INSERT trigger updates the row, so read it again under the same
  -- transaction. Raising here rolls back both the intent and Opportunity.
  SELECT * INTO v_intent FROM public.sales_patient_enrollment_intents
    WHERE id=v_intent.id;
  IF v_intent.opportunity_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.sales_opportunities o
    WHERE o.organization_id=v_intent.organization_id
      AND o.id=v_intent.opportunity_id AND o.archived_at IS NULL) THEN
    RAISE EXCEPTION 'PATIENT_OPPORTUNITY_NOT_CREATED' USING ERRCODE='22023';
  END IF;
  RETURN jsonb_build_object('id',v_intent.id,'status',v_intent.status,
    'amount_cents',v_intent.amount_cents,'initial_months',v_intent.initial_months,
    'opportunity_id',v_intent.opportunity_id);
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_patient_enroll(uuid,text,text,text,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_enroll(uuid,text,text,text,uuid)
  TO service_role;

CREATE UNIQUE INDEX sales_patient_intent_identity_ref_unique
  ON public.sales_patient_enrollment_intents(organization_id,id,patient_identity_id);
CREATE TABLE public.sales_patient_family_draft_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_identity_id uuid NOT NULL,
  enrollment_intent_id uuid NOT NULL,
  first_name text NOT NULL CHECK (length(btrim(first_name)) BETWEEN 1 AND 80),
  last_name text NOT NULL CHECK (length(btrim(last_name)) BETWEEN 1 AND 80),
  date_of_birth date NOT NULL CHECK (date_of_birth >= date '1900-01-01'),
  relationship text NOT NULL CHECK (relationship IN ('SPOUSE','CHILD','PARENT','OTHER')),
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','REMOVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id,patient_identity_id)
    REFERENCES public.sales_patient_identities(organization_id,id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id,enrollment_intent_id,patient_identity_id)
    REFERENCES public.sales_patient_enrollment_intents(organization_id,id,patient_identity_id)
      ON DELETE RESTRICT,
  UNIQUE (organization_id,id)
);
CREATE INDEX sales_patient_family_draft_intent_idx
  ON public.sales_patient_family_draft_members(organization_id,enrollment_intent_id,created_at,id)
  WHERE status='DRAFT';
CREATE UNIQUE INDEX sales_patient_family_draft_person_unique
  ON public.sales_patient_family_draft_members(
    organization_id,enrollment_intent_id,lower(btrim(first_name)),
    lower(btrim(last_name)),date_of_birth,relationship)
  WHERE status='DRAFT';
ALTER TABLE public.sales_patient_family_draft_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sales_patient_family_draft_members FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.sales_patient_family_draft_members TO service_role;

CREATE TABLE public.sales_patient_family_draft_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_identity_id uuid NOT NULL,
  enrollment_intent_id uuid NOT NULL,
  member_id uuid NOT NULL,
  request_key uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('ADD','EDIT','REMOVE')),
  before_member jsonb,
  after_member jsonb,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id,patient_identity_id)
    REFERENCES public.sales_patient_identities(organization_id,id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id,enrollment_intent_id,patient_identity_id)
    REFERENCES public.sales_patient_enrollment_intents(organization_id,id,patient_identity_id)
      ON DELETE RESTRICT,
  FOREIGN KEY (organization_id,member_id)
    REFERENCES public.sales_patient_family_draft_members(organization_id,id) ON DELETE RESTRICT,
  UNIQUE (patient_identity_id,request_key)
);
CREATE INDEX sales_patient_family_draft_events_intent_idx
  ON public.sales_patient_family_draft_events(organization_id,enrollment_intent_id,created_at);
ALTER TABLE public.sales_patient_family_draft_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sales_patient_family_draft_events FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.sales_patient_family_draft_events TO service_role;

CREATE FUNCTION public.native_sales_patient_family_draft_action(
  p_identity_id uuid,p_action text,p_member_id uuid,p_first_name text,
  p_last_name text,p_date_of_birth date,p_relationship text,p_request_key uuid
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=public,pg_temp AS $$
DECLARE v_identity public.sales_patient_identities%ROWTYPE;
DECLARE v_intent public.sales_patient_enrollment_intents%ROWTYPE;
DECLARE v_member public.sales_patient_family_draft_members%ROWTYPE;
DECLARE v_before jsonb;
DECLARE v_after jsonb;
DECLARE v_result jsonb;
DECLARE v_count integer;
DECLARE v_id uuid;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'PATIENT_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  IF p_identity_id IS NULL OR p_request_key IS NULL
    OR p_action IS NULL OR p_action NOT IN ('ADD','EDIT','REMOVE')
    OR (p_action='ADD' AND p_member_id IS NOT NULL)
    OR (p_action IN ('EDIT','REMOVE') AND p_member_id IS NULL) THEN
    RAISE EXCEPTION 'PATIENT_FAMILY_DRAFT_INVALID' USING ERRCODE='22023';
  END IF;
  IF p_action IN ('ADD','EDIT') AND (
    p_first_name IS NULL OR length(btrim(p_first_name)) NOT BETWEEN 1 AND 80
    OR p_last_name IS NULL OR length(btrim(p_last_name)) NOT BETWEEN 1 AND 80
    OR p_relationship IS NULL OR p_relationship NOT IN ('SPOUSE','CHILD','PARENT','OTHER')
    OR p_date_of_birth IS NULL OR p_date_of_birth<date '1900-01-01'
    OR p_date_of_birth>current_date) THEN
    RAISE EXCEPTION 'PATIENT_FAMILY_DRAFT_INVALID' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_identity FROM public.sales_patient_identities
    WHERE id=p_identity_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PATIENT_IDENTITY_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  SELECT result INTO v_result FROM public.sales_patient_family_draft_events
    WHERE patient_identity_id=p_identity_id AND request_key=p_request_key;
  IF FOUND THEN RETURN v_result; END IF;
  IF EXISTS (SELECT 1 FROM public.sales_memberships
    WHERE organization_id=v_identity.organization_id
      AND primary_contact_id=v_identity.contact_id AND status='ACTIVE') THEN
    RAISE EXCEPTION 'PATIENT_MEMBERSHIP_ACTIVE' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_intent FROM public.sales_patient_enrollment_intents
    WHERE organization_id=v_identity.organization_id AND patient_identity_id=p_identity_id
      AND status IN ('PAYMENT_UNAVAILABLE','PAYMENT_PENDING')
    ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND OR v_intent.membership_type<>'FAMILY' OR v_intent.opportunity_id IS NULL THEN
    RAISE EXCEPTION 'PATIENT_FAMILY_DRAFT_NOT_ELIGIBLE' USING ERRCODE='22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.sales_patient_qbo_manual
    WHERE organization_id=v_intent.organization_id
      AND enrollment_intent_id=v_intent.id
      AND (qbo_invoice_number IS NOT NULL OR verification_state<>'PENDING_INVOICE')) THEN
    RAISE EXCEPTION 'PATIENT_FAMILY_DRAFT_INVOICE_LOCKED' USING ERRCODE='22023';
  END IF;
  IF p_action='ADD' THEN
    SELECT count(*) INTO v_count FROM public.sales_patient_family_draft_members
      WHERE organization_id=v_intent.organization_id
        AND enrollment_intent_id=v_intent.id AND status='DRAFT';
    IF v_count>=2 THEN RAISE EXCEPTION 'HOUSEHOLD_LIMIT_REACHED' USING ERRCODE='22023'; END IF;
    INSERT INTO public.sales_patient_family_draft_members
      (organization_id,patient_identity_id,enrollment_intent_id,
       first_name,last_name,date_of_birth,relationship)
    VALUES (v_intent.organization_id,p_identity_id,v_intent.id,btrim(p_first_name),
      btrim(p_last_name),p_date_of_birth,p_relationship)
    RETURNING id INTO v_id;
    SELECT to_jsonb(m) INTO v_after FROM public.sales_patient_family_draft_members m
      WHERE m.id=v_id;
  ELSE
    SELECT * INTO v_member FROM public.sales_patient_family_draft_members
      WHERE organization_id=v_intent.organization_id AND patient_identity_id=p_identity_id
        AND enrollment_intent_id=v_intent.id AND id=p_member_id AND status='DRAFT'
      FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'PATIENT_FAMILY_DRAFT_NOT_FOUND' USING ERRCODE='P0002'; END IF;
    v_id:=v_member.id;
    v_before:=to_jsonb(v_member);
    IF p_action='EDIT' THEN
      UPDATE public.sales_patient_family_draft_members SET
        first_name=btrim(p_first_name),last_name=btrim(p_last_name),
        date_of_birth=p_date_of_birth,relationship=p_relationship,updated_at=now()
        WHERE id=v_id;
    ELSE
      UPDATE public.sales_patient_family_draft_members SET status='REMOVED',updated_at=now()
        WHERE id=v_id;
    END IF;
    SELECT to_jsonb(m) INTO v_after FROM public.sales_patient_family_draft_members m
      WHERE m.id=v_id;
  END IF;
  SELECT count(*) INTO v_count FROM public.sales_patient_family_draft_members
    WHERE organization_id=v_intent.organization_id
      AND enrollment_intent_id=v_intent.id AND status='DRAFT';
  v_result:=jsonb_build_object('memberId',v_id,'capacityUsed',v_count+1,
    'status',CASE WHEN p_action='REMOVE' THEN 'REMOVED' ELSE 'DRAFT' END);
  INSERT INTO public.sales_patient_family_draft_events
    (organization_id,patient_identity_id,enrollment_intent_id,member_id,
     request_key,action,before_member,after_member,result)
  VALUES (v_intent.organization_id,p_identity_id,v_intent.id,v_id,
    p_request_key,p_action,v_before,v_after,v_result);
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_patient_family_draft_action(
  uuid,text,uuid,text,text,date,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_family_draft_action(
  uuid,text,uuid,text,text,date,text,uuid) TO service_role;

-- A paid activation moves prepared dependants into the existing EMC review
-- queue. It does not create Contacts, approve coverage, or issue member codes.
CREATE FUNCTION public.native_sales_patient_family_drafts_after_activation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_membership public.sales_memberships%ROWTYPE;
BEGIN
  IF NEW.status<>'FULFILLED' OR NEW.membership_type<>'FAMILY'
    OR NEW.membership_id IS NULL OR OLD.status='FULFILLED' THEN RETURN NEW; END IF;
  SELECT * INTO v_membership FROM public.sales_memberships
    WHERE organization_id=NEW.organization_id AND id=NEW.membership_id
      AND status='ACTIVE' AND sales_payment_id IS NOT NULL
      AND payment_confirmed_at IS NOT NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'PATIENT_FAMILY_ACTIVATION_UNVERIFIED' USING ERRCODE='42501'; END IF;
  INSERT INTO public.sales_family_requests
    (organization_id,membership_id,requested_by,patient_identity_id,
     first_name,last_name,date_of_birth,relationship,idempotency_key,
     additional_fee_review)
  SELECT d.organization_id,NEW.membership_id,v_membership.created_by,
    d.patient_identity_id,d.first_name,d.last_name,d.date_of_birth,
    d.relationship,'family-draft-'||d.id::text,false
  FROM public.sales_patient_family_draft_members d
  WHERE d.organization_id=NEW.organization_id
    AND d.patient_identity_id=NEW.patient_identity_id
    AND d.enrollment_intent_id=NEW.id AND d.status='DRAFT'
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER sales_patient_family_drafts_after_activation
  AFTER UPDATE OF status,membership_id ON public.sales_patient_enrollment_intents
  FOR EACH ROW EXECUTE FUNCTION public.native_sales_patient_family_drafts_after_activation();
REVOKE ALL ON FUNCTION public.native_sales_patient_family_drafts_after_activation()
  FROM PUBLIC,anon,authenticated;
