-- Family expansion: approved preparation → immutable quote → verified payment → household activation.
-- Historical migrations and existing patient/business records are not rewritten.
ALTER TABLE public.sales_patient_enrollment_intents
  ADD COLUMN additional_member_count integer NOT NULL DEFAULT 0 CHECK(additional_member_count BETWEEN 0 AND 9),
  ADD COLUMN family_policy_version text CHECK(family_policy_version='FAMILY_EXPANSION_V1'),
  ADD COLUMN family_membership_id uuid,
  ADD COLUMN family_base_amount_cents integer CHECK(family_base_amount_cents>=0),
  ADD COLUMN family_additional_unit_cents integer CHECK(family_additional_unit_cents>=0),
  ADD COLUMN family_pricing_snapshot jsonb,
  ADD FOREIGN KEY(organization_id,family_membership_id) REFERENCES public.sales_memberships(organization_id,id);
ALTER TABLE public.sales_patient_family_draft_members
  ADD COLUMN authority_attested_at timestamptz,
  ADD COLUMN authority_auth_id uuid REFERENCES auth.users(id),
  ADD COLUMN review_status text NOT NULL DEFAULT 'PENDING' CHECK(review_status IN ('PENDING','APPROVED','REJECTED')),
  ADD COLUMN reviewed_by uuid,
  ADD COLUMN reviewed_at timestamptz,
  ADD FOREIGN KEY(organization_id,reviewed_by) REFERENCES public.sales_members(organization_id,id);
ALTER TABLE public.sales_household_members
  ADD COLUMN is_additional boolean NOT NULL DEFAULT false,
  ADD COLUMN activation_intent_id uuid,
  ADD COLUMN coverage_starts_at date,
  ADD COLUMN included_visits integer CHECK(included_visits>=0),
  ADD FOREIGN KEY(organization_id,activation_intent_id) REFERENCES public.sales_patient_enrollment_intents(organization_id,id);
ALTER TABLE public.sales_family_requests
  ADD COLUMN billing_intent_id uuid,
  ADD COLUMN prepared_member_id uuid,
  ADD FOREIGN KEY(organization_id,billing_intent_id) REFERENCES public.sales_patient_enrollment_intents(organization_id,id),
  ADD FOREIGN KEY(organization_id,prepared_member_id) REFERENCES public.sales_patient_family_draft_members(organization_id,id);
CREATE UNIQUE INDEX sales_family_prepared_member_once ON public.sales_family_requests(organization_id,prepared_member_id) WHERE prepared_member_id IS NOT NULL;

-- Extend only the purpose-related checks; retain all existing unrelated validation.
DO $$
DECLARE c record;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='public.sales_patient_enrollment_intents'::regclass
    AND contype='c' AND position('purpose' in pg_get_constraintdef(oid))>0 LOOP
    EXECUTE format('ALTER TABLE public.sales_patient_enrollment_intents DROP CONSTRAINT %I',c.conname);
  END LOOP;
  FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='public.sales_qbo_invoice_jobs'::regclass
    AND contype='c' AND position('purpose' in pg_get_constraintdef(oid))>0 LOOP
    EXECUTE format('ALTER TABLE public.sales_qbo_invoice_jobs DROP CONSTRAINT %I',c.conname);
  END LOOP;
END;
$$;
ALTER TABLE public.sales_patient_enrollment_intents
  ADD CONSTRAINT family_purpose CHECK(purpose IN ('ENROLLMENT','RENEWAL','FAMILY_ADDITION')),
  ADD CONSTRAINT family_type_count CHECK(membership_type='FAMILY' OR additional_member_count=0),
  ADD CONSTRAINT family_purpose_binding CHECK(
    (purpose='ENROLLMENT' AND renewal_membership_id IS NULL AND renewal_base_expires_at IS NULL AND family_membership_id IS NULL)
    OR (purpose='RENEWAL' AND renewal_membership_id IS NOT NULL AND renewal_base_expires_at IS NOT NULL AND family_membership_id IS NULL)
    OR (purpose='FAMILY_ADDITION' AND family_membership_id IS NOT NULL AND renewal_membership_id IS NULL AND renewal_base_expires_at IS NULL
      AND membership_type='FAMILY' AND additional_member_count BETWEEN 1 AND 9 AND family_policy_version='FAMILY_EXPANSION_V1' AND family_pricing_snapshot IS NOT NULL)),
  ADD CONSTRAINT family_initial_months CHECK(
    (purpose='ENROLLMENT' AND initial_months IN (2,3,6,12)) OR (purpose='RENEWAL' AND initial_months IN (1,3,6,12))
    OR (purpose='FAMILY_ADDITION' AND initial_months=1));
ALTER TABLE public.sales_qbo_invoice_jobs
  ADD COLUMN additional_member_count integer NOT NULL DEFAULT 0 CHECK(additional_member_count BETWEEN 0 AND 9),
  ADD COLUMN family_base_amount_cents integer,
  ADD COLUMN family_additional_unit_cents integer,
  ADD COLUMN family_pricing_snapshot jsonb,
  ADD COLUMN family_policy_version text,
  ADD CHECK(purpose IN ('ENROLLMENT','RENEWAL','FAMILY_ADDITION'));
CREATE UNIQUE INDEX sales_patient_one_pending_family_addition ON public.sales_patient_enrollment_intents(organization_id,family_membership_id)
  WHERE purpose='FAMILY_ADDITION' AND status NOT IN ('CANCELLED','FULFILLED');
ALTER TABLE public.sales_patient_family_draft_events DROP CONSTRAINT sales_patient_family_draft_events_action_check;
ALTER TABLE public.sales_patient_family_draft_events ADD CHECK(action IN ('ADD','EDIT','REMOVE','APPROVE','REJECT'));

CREATE FUNCTION public.native_sales_family_expanded_quote(p_plan text,p_duration text,p_count integer,p_renewal boolean DEFAULT false)
RETURNS TABLE(base_cents integer,monthly_member_cents integer,member_unit_cents integer,additional_cents integer,total_cents integer,months integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE q record; rate integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501'; END IF;
  IF p_count IS NULL OR p_count NOT BETWEEN 0 AND 9 OR p_renewal IS NULL THEN RAISE EXCEPTION 'INVALID_ADDITIONAL_MEMBER_COUNT' USING ERRCODE='22023'; END IF;
  SELECT * INTO q FROM public.native_sales_membership_quote(p_plan,'FAMILY',p_duration);
  SELECT individual_monthly_cents INTO rate FROM public.sales_membership_price_catalog WHERE plan=p_plan;
  months:=CASE WHEN p_renewal AND p_duration='MONTHLY' THEN 1 ELSE q.initial_months END;
  base_cents:=CASE WHEN p_renewal AND p_duration='MONTHLY' THEN q.monthly_cents ELSE q.total_cents END;
  monthly_member_cents:=rate;member_unit_cents:=rate*months;additional_cents:=member_unit_cents*p_count;total_cents:=base_cents+additional_cents;
  RETURN NEXT;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_family_expanded_quote(text,text,integer,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_family_expanded_quote(text,text,integer,boolean) TO service_role;

CREATE FUNCTION public.native_sales_family_prorated_quote(p_membership_id uuid,p_count integer,p_as_of date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE m public.sales_memberships%ROWTYPE; period public.sales_membership_periods%ROWTYPE;
DECLARE rate integer; n numeric:=0; d numeric:=1; divisor numeric; cycles jsonb:='[]';
DECLARE covered date; cycle_from date; cycle_end date; natural_end date; charged_from date; charged_until date;
DECLARE index integer; period_count integer:=0; previous_end date; charged_days integer; cycle_days integer; unit_cents integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501'; END IF;
  IF p_count IS NULL OR p_count NOT BETWEEN 1 AND 9 OR p_as_of IS NULL THEN RAISE EXCEPTION 'INVALID_ADDITIONAL_MEMBER_COUNT' USING ERRCODE='22023'; END IF;
  SELECT * INTO m FROM public.sales_memberships WHERE id=p_membership_id AND membership_type='FAMILY'
    AND status='ACTIVE' AND NOT is_demo AND sales_payment_id IS NOT NULL AND payment_confirmed_at IS NOT NULL;
  IF NOT FOUND OR p_as_of>=m.expires_at THEN RAISE EXCEPTION 'FAMILY_ADDITION_NOT_ELIGIBLE' USING ERRCODE='22023'; END IF;
  SELECT individual_monthly_cents INTO rate FROM public.sales_membership_price_catalog WHERE plan=m.plan;
  IF rate IS NULL OR rate<=0 THEN RAISE EXCEPTION 'INVALID_FAMILY_PLAN' USING ERRCODE='22023'; END IF;
  covered:=p_as_of;
  FOR period IN SELECT * FROM public.sales_membership_periods WHERE organization_id=m.organization_id AND membership_id=m.id ORDER BY starts_at,id LOOP
    period_count:=period_count+1;
    IF period_count>1200 OR (previous_end IS NOT NULL AND previous_end>period.starts_at) THEN RAISE EXCEPTION 'INVALID_FAMILY_PERIOD' USING ERRCODE='22023'; END IF;
    previous_end:=period.expires_at;
    IF period.expires_at<=p_as_of OR period.starts_at>=m.expires_at THEN CONTINUE; END IF;
    IF period.starts_at>covered THEN RAISE EXCEPTION 'FAMILY_UNPAID_PERIOD' USING ERRCODE='22023'; END IF;
    index:=0;cycle_from:=period.starts_at;
    WHILE cycle_from<period.expires_at LOOP
      index:=index+1;
      IF index>120 THEN RAISE EXCEPTION 'INVALID_FAMILY_PERIOD' USING ERRCODE='22023'; END IF;
      natural_end:=public.native_sales_add_membership_months(period.starts_at,index);
      cycle_end:=least(natural_end,period.expires_at);charged_from:=greatest(cycle_from,p_as_of);charged_until:=least(cycle_end,m.expires_at);
      IF charged_until>charged_from THEN
        charged_days:=charged_until-charged_from;cycle_days:=natural_end-cycle_from;
        n:=n*cycle_days+charged_days*d;d:=d*cycle_days;divisor:=gcd(n,d);n:=n/divisor;d:=d/divisor;
        cycles:=cycles||jsonb_build_array(jsonb_build_object('startsAt',cycle_from,'expiresAt',cycle_end,'chargedFrom',charged_from,'chargedDays',charged_days,'cycleDays',cycle_days));
        covered:=charged_until;
      END IF;
      cycle_from:=cycle_end;
    END LOOP;
  END LOOP;
  IF covered<>m.expires_at OR n<=0 THEN RAISE EXCEPTION 'FAMILY_UNPAID_PERIOD' USING ERRCODE='22023'; END IF;
  unit_cents:=floor((rate*n*2+d)/(d*2));
  IF unit_cents<=0 THEN RAISE EXCEPTION 'INVALID_FAMILY_QUOTE' USING ERRCODE='22023'; END IF;
  RETURN jsonb_build_object('version','CALENDAR_MONTH_DAYS_V1','asOf',p_as_of,'expiresAt',m.expires_at,'count',p_count,
    'monthlyCents',rate,'perMemberCents',unit_cents,'totalCents',unit_cents*p_count,
    'monthNumerator',trim_scale(n)::text,'monthDenominator',trim_scale(d)::text,'cycles',cycles);
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_family_prorated_quote(uuid,integer,date) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_family_prorated_quote(uuid,integer,date) TO service_role;

-- Explicit Family overload; the existing Individual and legacy internal call remain unchanged.
CREATE OR REPLACE FUNCTION public.native_sales_patient_enroll(
  p_identity_id uuid,p_plan text,p_type text,p_duration text,p_request_key uuid,p_additional_members integer
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=public,pg_temp AS $$
DECLARE v_identity public.sales_patient_identities%ROWTYPE;
DECLARE v_existing public.sales_patient_enrollment_intents%ROWTYPE;
DECLARE v_intent public.sales_patient_enrollment_intents%ROWTYPE;
DECLARE v_quote record;
DECLARE expanded record;
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
  IF p_additional_members IS NULL OR p_additional_members NOT BETWEEN 0 AND 9 OR (p_type<>'FAMILY' AND p_additional_members<>0) THEN
    RAISE EXCEPTION 'INVALID_ADDITIONAL_MEMBER_COUNT' USING ERRCODE='22023'; END IF;
  IF p_type<>'FAMILY' THEN RETURN public.native_sales_patient_enroll(p_identity_id,p_plan,p_type,p_duration,p_request_key); END IF;
  SELECT * INTO v_identity FROM public.sales_patient_identities
    WHERE id=p_identity_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PATIENT_IDENTITY_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  SELECT * INTO v_existing FROM public.sales_patient_enrollment_intents
    WHERE patient_identity_id=p_identity_id AND idempotency_key=p_request_key;
  IF FOUND THEN
    IF v_existing.plan<>p_plan OR v_existing.membership_type<>p_type
      OR v_existing.duration<>p_duration OR v_existing.additional_member_count<>p_additional_members THEN
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
  SELECT * INTO expanded FROM public.native_sales_family_expanded_quote(p_plan,p_duration,p_additional_members,false);
  v_quote.total_cents:=expanded.total_cents;
  INSERT INTO public.sales_patient_enrollment_intents
    (organization_id,patient_identity_id,plan,membership_type,duration,
     initial_months,amount_cents,idempotency_key,status,additional_member_count,family_policy_version,
     family_base_amount_cents,family_additional_unit_cents,family_pricing_snapshot)
  VALUES (v_identity.organization_id,p_identity_id,p_plan,p_type,p_duration,
    v_quote.initial_months,v_quote.total_cents,p_request_key,'PAYMENT_UNAVAILABLE',p_additional_members,'FAMILY_EXPANSION_V1',
    expanded.base_cents,expanded.member_unit_cents,jsonb_build_object('version','FAMILY_EXPANSION_V1','baseCents',expanded.base_cents,
      'monthlyCents',expanded.monthly_member_cents,'perMemberCents',expanded.member_unit_cents,'totalCents',expanded.total_cents,
      'count',p_additional_members,'months',expanded.months,'additionalCents',expanded.additional_cents))
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
REVOKE ALL ON FUNCTION public.native_sales_patient_enroll(uuid,text,text,text,uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_enroll(uuid,text,text,text,uuid,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.native_sales_patient_intent_opportunity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_identity public.sales_patient_identities%ROWTYPE;
DECLARE v_contact public.sales_contacts%ROWTYPE;
DECLARE v_stage public.sales_stages%ROWTYPE;
DECLARE v_account uuid;
DECLARE v_opportunity uuid;
DECLARE v_previous_intent uuid;
DECLARE v_quote record;
BEGIN
  IF NEW.purpose='FAMILY_ADDITION' THEN
    PERFORM public.native_sales_patient_family_addition_opportunity(NEW.id); RETURN NEW;
  END IF;
  IF NEW.purpose='RENEWAL' THEN
    PERFORM public.native_sales_patient_renewal_opportunity(NEW.id); RETURN NEW;
  END IF;
  IF NEW.organization_id<>'9efab353-46a0-43d1-9901-e3f185dc5d30' THEN RETURN NEW; END IF;
  SELECT * INTO v_identity FROM public.sales_patient_identities
    WHERE organization_id=NEW.organization_id AND id=NEW.patient_identity_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'PATIENT_IDENTITY_NOT_FOUND'; END IF;
  PERFORM public.native_sales_patient_ensure_lead(v_identity.id);
  SELECT * INTO v_contact FROM public.sales_contacts
    WHERE organization_id=NEW.organization_id AND id=v_identity.contact_id FOR UPDATE;
  SELECT * INTO v_quote FROM public.native_sales_membership_quote(
    NEW.plan,NEW.membership_type,NEW.duration);
  IF NEW.membership_type='FAMILY' AND NEW.additional_member_count>0 THEN
    v_quote.total_cents:=v_quote.total_cents+NEW.additional_member_count*NEW.initial_months*(SELECT individual_monthly_cents FROM public.sales_membership_price_catalog WHERE plan=NEW.plan);
  END IF;
  IF v_quote.total_cents<>NEW.amount_cents OR v_quote.initial_months<>NEW.initial_months
    OR NEW.status NOT IN ('PAYMENT_UNAVAILABLE','PAYMENT_PENDING') THEN
    RAISE EXCEPTION 'PATIENT_INTENT_QUOTE_CONFLICT';
  END IF;
  SELECT s.* INTO v_stage FROM public.sales_stages s
    JOIN public.sales_pipelines p ON p.organization_id=s.organization_id AND p.id=s.pipeline_id
    WHERE s.organization_id=NEW.organization_id AND p.code='PATIENT_ENROLLMENT'
      AND p.active AND s.code='PAYMENT_PENDING';
  IF NOT FOUND THEN RAISE EXCEPTION 'EMC_PIPELINE_NOT_READY'; END IF;
  v_account:=v_contact.primary_account_id;
  IF v_account IS NULL THEN
    INSERT INTO public.sales_accounts
      (organization_id,owner_member_id,team_id,name,type,created_by,updated_by)
    VALUES (NEW.organization_id,v_contact.owner_member_id,v_contact.team_id,
      v_contact.display_name,'prospect',v_contact.owner_member_id,v_contact.owner_member_id)
    RETURNING id INTO v_account;
    UPDATE public.sales_contacts SET primary_account_id=v_account,version=version+1,
      updated_at=now(),updated_by=v_contact.owner_member_id
      WHERE organization_id=NEW.organization_id AND id=v_contact.id;
    INSERT INTO public.sales_account_contacts
      (organization_id,account_id,contact_id,is_primary)
    VALUES (NEW.organization_id,v_account,v_contact.id,true);
  END IF;

  -- The identity row is locked by native_sales_patient_enroll(). Reuse only a
  -- cancelled Opportunity that has never acquired invoice/payment evidence.
  SELECT previous_intent.id,o.id INTO v_previous_intent,v_opportunity
    FROM public.sales_patient_enrollment_intents previous_intent
    JOIN public.sales_opportunities o ON o.organization_id=previous_intent.organization_id
      AND o.id=previous_intent.opportunity_id
    JOIN public.sales_stages prior_stage ON prior_stage.organization_id=o.organization_id
      AND prior_stage.id=o.stage_id AND prior_stage.code='LOST'
    WHERE previous_intent.organization_id=NEW.organization_id
      AND previous_intent.patient_identity_id=NEW.patient_identity_id
      AND previous_intent.status='CANCELLED' AND previous_intent.purpose='ENROLLMENT' AND previous_intent.membership_id IS NULL
      AND NEW.family_policy_version IS NULL AND previous_intent.family_policy_version IS NULL
      AND o.archived_at IS NULL AND o.primary_contact_id=v_contact.id
      AND o.source='Patient Portal' AND o.product='Corazón Salud'
      AND NOT EXISTS (SELECT 1 FROM public.sales_patient_qbo_manual q
        WHERE q.organization_id=previous_intent.organization_id
          AND q.enrollment_intent_id=previous_intent.id)
      AND NOT EXISTS (SELECT 1 FROM public.sales_payments p
        WHERE p.organization_id=o.organization_id AND p.opportunity_id=o.id)
      AND NOT EXISTS (SELECT 1 FROM public.sales_memberships m
        WHERE m.organization_id=o.organization_id AND m.opportunity_id=o.id)
      AND NOT EXISTS (SELECT 1 FROM public.sales_patient_enrollment_intents current_intent
        WHERE current_intent.organization_id=o.organization_id
          AND current_intent.opportunity_id=o.id AND current_intent.status<>'CANCELLED')
    ORDER BY previous_intent.created_at DESC,previous_intent.id DESC LIMIT 1 FOR UPDATE OF o;

  IF v_opportunity IS NULL THEN
    INSERT INTO public.sales_opportunities
      (organization_id,owner_member_id,team_id,name,account_id,primary_contact_id,
       stage_id,probability,currency,amount,expected_close_date,description,
       source,product,created_by,updated_by)
    VALUES (NEW.organization_id,v_contact.owner_member_id,v_contact.team_id,
      'Corazón Salud enrollment '||NEW.id::text,v_account,v_contact.id,
      v_stage.id,v_stage.probability,'USD',NEW.amount_cents::numeric/100,
      current_date+30,
      'Plan: '||NEW.plan||'; Type: '||NEW.membership_type||'; Modality: '||NEW.duration,
      'Patient Portal','Corazón Salud',v_contact.owner_member_id,v_contact.owner_member_id)
    RETURNING id INTO v_opportunity;
    INSERT INTO public.sales_opportunity_contacts(organization_id,opportunity_id,contact_id)
      VALUES (NEW.organization_id,v_opportunity,v_contact.id);
  ELSE
    UPDATE public.sales_opportunities SET stage_id=v_stage.id,
      probability=v_stage.probability,amount=NEW.amount_cents::numeric/100,
      name='Corazón Salud enrollment '||NEW.id::text,
      description='Plan: '||NEW.plan||'; Type: '||NEW.membership_type||'; Modality: '||NEW.duration,
      lost_reason=NULL,version=version+1,updated_by=owner_member_id,updated_at=now()
      WHERE organization_id=NEW.organization_id AND id=v_opportunity;
  END IF;
  UPDATE public.sales_patient_enrollment_intents SET opportunity_id=v_opportunity
    WHERE id=NEW.id;
  INSERT INTO public.sales_history
    (organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
  VALUES (NEW.organization_id,'opportunity',v_opportunity,v_contact.owner_member_id,
    CASE WHEN v_previous_intent IS NULL THEN 'patient_enrollment_pending'
      ELSE 'patient_enrollment_reselected' END,gen_random_uuid(),
    jsonb_build_object('intentId',NEW.id,'previousIntentId',v_previous_intent,
      'plan',NEW.plan,'type',NEW.membership_type,
      'duration',NEW.duration,'amountCents',NEW.amount_cents));
  RETURN NEW;
END;
$$;

-- A new Family selection retains prepared people but requires fresh review.
-- Never mutate an already claimed/invoiced quote or acceptance evidence.
CREATE FUNCTION public.native_sales_patient_selection_action(
  p_identity_id uuid,p_action text,p_plan text,p_type text,p_duration text,p_request_key uuid,p_additional_members integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE identity public.sales_patient_identities%ROWTYPE; i public.sales_patient_enrollment_intents%ROWTYPE;
DECLARE result jsonb; prior_event public.sales_patient_selection_events%ROWTYPE; new_id uuid; internal_key uuid:=gen_random_uuid(); draft_count integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'PATIENT_SERVER_ONLY' USING ERRCODE='42501'; END IF;
  IF p_action<>'CHANGE' OR p_request_key IS NULL OR p_additional_members IS NULL OR p_additional_members NOT BETWEEN 0 AND 9
    OR (p_type<>'FAMILY' AND p_additional_members<>0) THEN RAISE EXCEPTION 'PATIENT_SELECTION_INVALID' USING ERRCODE='22023'; END IF;
  SELECT * INTO identity FROM public.sales_patient_identities WHERE id=p_identity_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PATIENT_IDENTITY_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  SELECT * INTO prior_event FROM public.sales_patient_selection_events WHERE patient_identity_id=p_identity_id AND request_key=p_request_key;
  IF FOUND THEN
    IF prior_event.action<>'CHANGE' OR prior_event.after_selection->>'plan' IS DISTINCT FROM p_plan
      OR prior_event.after_selection->>'type' IS DISTINCT FROM p_type OR prior_event.after_selection->>'duration' IS DISTINCT FROM p_duration
      OR (prior_event.after_selection->>'additionalMembers')::integer IS DISTINCT FROM p_additional_members THEN
      RAISE EXCEPTION 'PATIENT_IDEMPOTENCY_CONFLICT' USING ERRCODE='23505'; END IF;
    RETURN prior_event.result;
  END IF;
  SELECT * INTO i FROM public.sales_patient_enrollment_intents WHERE organization_id=identity.organization_id
    AND patient_identity_id=identity.id AND purpose='ENROLLMENT' AND status NOT IN ('CANCELLED','FULFILLED') ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PATIENT_SELECTION_NOT_PENDING' USING ERRCODE='22023'; END IF;
  IF i.membership_type<>'FAMILY' AND p_type<>'FAMILY' THEN RETURN public.native_sales_patient_selection_action(p_identity_id,p_action,p_plan,p_type,p_duration,p_request_key); END IF;
  IF EXISTS(SELECT 1 FROM public.sales_qbo_invoice_jobs WHERE organization_id=i.organization_id AND enrollment_intent_id=i.id)
    OR EXISTS(SELECT 1 FROM public.sales_patient_qbo_manual WHERE organization_id=i.organization_id AND enrollment_intent_id=i.id AND qbo_invoice_number IS NOT NULL) THEN
    IF i.family_policy_version IS NULL AND i.additional_member_count=0 AND p_additional_members=0 THEN
      RETURN public.native_sales_patient_selection_action(p_identity_id,p_action,p_plan,p_type,p_duration,p_request_key);
    END IF;
    RAISE EXCEPTION 'PATIENT_FAMILY_DRAFT_INVOICE_LOCKED' USING ERRCODE='22023';
  END IF;
  SELECT count(*) INTO draft_count FROM public.sales_patient_family_draft_members WHERE organization_id=i.organization_id AND enrollment_intent_id=i.id AND status='DRAFT';
  IF (p_type='FAMILY' AND draft_count>2+p_additional_members) OR (p_type<>'FAMILY' AND draft_count>0) THEN
    RAISE EXCEPTION 'FAMILY_REMOVE_EXCESS_DRAFTS_FIRST' USING ERRCODE='22023'; END IF;
  PERFORM public.native_sales_patient_selection_action(p_identity_id,'CANCEL',NULL,NULL,NULL,internal_key);
  result:=public.native_sales_patient_enroll(p_identity_id,p_plan,p_type,p_duration,p_request_key,p_additional_members);
  new_id:=(result->>'id')::uuid;
  UPDATE public.sales_patient_family_draft_members SET enrollment_intent_id=new_id,review_status='PENDING',reviewed_by=NULL,reviewed_at=NULL,updated_at=now()
    WHERE organization_id=i.organization_id AND enrollment_intent_id=i.id AND status='DRAFT';
  result:=jsonb_build_object('status','PAYMENT_UNAVAILABLE','intentId',new_id);
  INSERT INTO public.sales_patient_selection_events(organization_id,patient_identity_id,enrollment_intent_id,request_key,action,before_selection,after_selection,result)
    VALUES(i.organization_id,identity.id,new_id,p_request_key,'CHANGE',to_jsonb(i),
      jsonb_build_object('plan',p_plan,'type',p_type,'duration',p_duration,'additionalMembers',p_additional_members),result);
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_patient_selection_action(uuid,text,text,text,text,uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_selection_action(uuid,text,text,text,text,uuid,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.native_sales_patient_family_draft_action(
  p_identity_id uuid,p_action text,p_member_id uuid,p_first_name text,
  p_last_name text,p_date_of_birth date,p_relationship text,p_request_key uuid,p_authority_attested boolean
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=public,pg_temp AS $$
DECLARE v_identity public.sales_patient_identities%ROWTYPE;
DECLARE v_intent public.sales_patient_enrollment_intents%ROWTYPE;
DECLARE v_member public.sales_patient_family_draft_members%ROWTYPE;
DECLARE v_before jsonb;
DECLARE v_after jsonb;
DECLARE v_prior public.sales_patient_family_draft_events%ROWTYPE;
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
  SELECT * INTO v_prior FROM public.sales_patient_family_draft_events
    WHERE patient_identity_id=p_identity_id AND request_key=p_request_key;
  IF FOUND THEN
    IF v_prior.action<>p_action OR (p_action<>'ADD' AND v_prior.member_id IS DISTINCT FROM p_member_id)
      OR (p_action<>'REMOVE' AND (v_prior.after_member->>'first_name',v_prior.after_member->>'last_name',v_prior.after_member->>'date_of_birth',v_prior.after_member->>'relationship')
        IS DISTINCT FROM (btrim(p_first_name),btrim(p_last_name),p_date_of_birth::text,p_relationship)) THEN
      RAISE EXCEPTION 'PATIENT_IDEMPOTENCY_CONFLICT' USING ERRCODE='23505'; END IF;
    RETURN v_prior.result;
  END IF;
  IF EXISTS (SELECT 1 FROM public.sales_memberships
    WHERE organization_id=v_identity.organization_id
      AND primary_contact_id=v_identity.contact_id AND status='ACTIVE') AND NOT EXISTS (
      SELECT 1 FROM public.sales_patient_enrollment_intents pending WHERE pending.organization_id=v_identity.organization_id
        AND pending.patient_identity_id=p_identity_id AND pending.purpose='FAMILY_ADDITION'
        AND pending.status IN ('PAYMENT_UNAVAILABLE','PAYMENT_PENDING')) THEN
    RAISE EXCEPTION 'PATIENT_MEMBERSHIP_ACTIVE' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_intent FROM public.sales_patient_enrollment_intents
    WHERE organization_id=v_identity.organization_id AND patient_identity_id=p_identity_id
      AND status IN ('PAYMENT_UNAVAILABLE','PAYMENT_PENDING')
    ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND OR v_intent.purpose NOT IN ('ENROLLMENT','FAMILY_ADDITION') OR v_intent.membership_type<>'FAMILY' OR v_intent.opportunity_id IS NULL THEN
    RAISE EXCEPTION 'PATIENT_FAMILY_DRAFT_NOT_ELIGIBLE' USING ERRCODE='22023';
  END IF;
  IF v_intent.family_policy_version='FAMILY_EXPANSION_V1' AND p_action<>'REMOVE' AND p_authority_attested IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'FAMILY_AUTHORITY_ATTESTATION_REQUIRED' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM public.sales_qbo_invoice_jobs WHERE organization_id=v_intent.organization_id AND enrollment_intent_id=v_intent.id) THEN
    RAISE EXCEPTION 'PATIENT_FAMILY_DRAFT_INVOICE_LOCKED' USING ERRCODE='22023'; END IF;
  IF v_intent.family_policy_version='FAMILY_EXPANSION_V1' AND p_action<>'REMOVE' AND EXISTS(
    SELECT 1 FROM public.sales_patient_family_draft_members other WHERE other.organization_id=v_intent.organization_id
      AND other.enrollment_intent_id=v_intent.id AND other.status='DRAFT' AND other.id IS DISTINCT FROM p_member_id
      AND lower(btrim(other.first_name))=lower(btrim(p_first_name)) AND lower(btrim(other.last_name))=lower(btrim(p_last_name))
      AND other.date_of_birth=p_date_of_birth) THEN
    RAISE EXCEPTION 'DEPENDENT_ALREADY_PREPARED' USING ERRCODE='23505'; END IF;
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
    IF v_count>=(CASE WHEN v_intent.purpose='FAMILY_ADDITION' THEN v_intent.additional_member_count ELSE 2+v_intent.additional_member_count END) THEN RAISE EXCEPTION 'HOUSEHOLD_LIMIT_REACHED' USING ERRCODE='22023'; END IF;
    INSERT INTO public.sales_patient_family_draft_members
      (organization_id,patient_identity_id,enrollment_intent_id,
       first_name,last_name,date_of_birth,relationship,authority_attested_at,authority_auth_id)
    VALUES (v_intent.organization_id,p_identity_id,v_intent.id,btrim(p_first_name),
      btrim(p_last_name),p_date_of_birth,p_relationship,CASE WHEN p_authority_attested THEN now() END,CASE WHEN p_authority_attested THEN v_identity.auth_id END)
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
        date_of_birth=p_date_of_birth,relationship=p_relationship,updated_at=now(),
        review_status='PENDING',reviewed_by=NULL,reviewed_at=NULL,
        authority_attested_at=CASE WHEN p_authority_attested THEN now() END,authority_auth_id=CASE WHEN p_authority_attested THEN v_identity.auth_id END
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
REVOKE ALL ON FUNCTION public.native_sales_patient_family_draft_action(uuid,text,uuid,text,text,date,text,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_family_draft_action(uuid,text,uuid,text,text,date,text,uuid,boolean) TO service_role;

-- Preserve legacy callers, but a new paid-expansion draft requires explicit authority attestation.
CREATE OR REPLACE FUNCTION public.native_sales_patient_family_draft_action(
  p_identity_id uuid,p_action text,p_member_id uuid,p_first_name text,p_last_name text,p_date_of_birth date,p_relationship text,p_request_key uuid
) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT public.native_sales_patient_family_draft_action(p_identity_id,p_action,p_member_id,p_first_name,p_last_name,p_date_of_birth,p_relationship,p_request_key,false);
$$;


CREATE FUNCTION public.native_sales_family_preparation_can_review(p_org uuid,p_actor uuid,p_intent uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT auth.role()='service_role' AND EXISTS(
    SELECT 1 FROM public.sales_members actor JOIN public.sales_organizations org ON org.id=actor.organization_id AND org.status='active'
    JOIN public.sales_patient_enrollment_intents i ON i.organization_id=actor.organization_id
    JOIN public.sales_opportunities op ON op.organization_id=i.organization_id AND op.id=i.opportunity_id AND op.archived_at IS NULL
    WHERE actor.organization_id=p_org AND actor.id=p_actor AND actor.status='active' AND i.id=p_intent AND (
      actor.role IN ('SUPERADMIN','ADMINISTRATOR') OR (actor.role='SALES_MANAGER'
      AND actor.organization_id='9efab353-46a0-43d1-9901-e3f185dc5d30' AND EXISTS(
        SELECT 1 FROM public.sales_team_members tm WHERE tm.organization_id=actor.organization_id AND tm.member_id=actor.id AND tm.team_id=op.team_id))));
$$;
REVOKE ALL ON FUNCTION public.native_sales_family_preparation_can_review(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_family_preparation_can_review(uuid,uuid,uuid) TO service_role;

CREATE FUNCTION public.native_sales_review_family_preparation(p_org uuid,p_actor uuid,p_intent uuid,p_member uuid,p_decision text,p_expected_updated_at timestamptz,p_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE i public.sales_patient_enrollment_intents%ROWTYPE; member public.sales_patient_family_draft_members%ROWTYPE;
DECLARE prior public.sales_patient_family_draft_events%ROWTYPE; before_row jsonb; result jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501'; END IF;
  IF p_key IS NULL OR p_decision IS NULL OR p_decision NOT IN ('APPROVED','REJECTED') OR p_expected_updated_at IS NULL THEN RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE='22023'; END IF;
  SELECT * INTO i FROM public.sales_patient_enrollment_intents WHERE organization_id=p_org AND id=p_intent FOR UPDATE;
  IF NOT FOUND OR NOT public.native_sales_family_preparation_can_review(p_org,p_actor,i.id) THEN RAISE EXCEPTION 'FAMILY_APPROVAL_FORBIDDEN' USING ERRCODE='42501'; END IF;
  SELECT * INTO prior FROM public.sales_patient_family_draft_events WHERE patient_identity_id=i.patient_identity_id AND request_key=p_key;
  IF FOUND THEN
    IF prior.member_id IS DISTINCT FROM p_member OR prior.action IS DISTINCT FROM (CASE p_decision WHEN 'APPROVED' THEN 'APPROVE' ELSE 'REJECT' END)
      OR (prior.before_member->>'updated_at')::timestamptz IS DISTINCT FROM p_expected_updated_at THEN
      RAISE EXCEPTION 'PATIENT_IDEMPOTENCY_CONFLICT' USING ERRCODE='23505'; END IF;
    RETURN prior.result;
  END IF;
  IF i.family_policy_version IS DISTINCT FROM 'FAMILY_EXPANSION_V1' OR i.status NOT IN ('PAYMENT_UNAVAILABLE','PAYMENT_PENDING')
    OR EXISTS(SELECT 1 FROM public.sales_qbo_invoice_jobs WHERE organization_id=p_org AND enrollment_intent_id=i.id) THEN
    RAISE EXCEPTION 'PATIENT_FAMILY_DRAFT_INVOICE_LOCKED' USING ERRCODE='22023'; END IF;
  SELECT * INTO member FROM public.sales_patient_family_draft_members WHERE organization_id=p_org AND enrollment_intent_id=i.id
    AND patient_identity_id=i.patient_identity_id AND id=p_member AND status='DRAFT' FOR UPDATE;
  IF NOT FOUND OR member.updated_at IS DISTINCT FROM p_expected_updated_at OR member.authority_attested_at IS NULL THEN
    RAISE EXCEPTION 'FAMILY_PREPARATION_CHANGED' USING ERRCODE='40001'; END IF;
  before_row:=to_jsonb(member);
  UPDATE public.sales_patient_family_draft_members SET review_status=p_decision,reviewed_by=p_actor,reviewed_at=now(),updated_at=now() WHERE id=member.id;
  result:=jsonb_build_object('memberId',member.id,'reviewStatus',p_decision,'coverageActive',false);
  INSERT INTO public.sales_patient_family_draft_events(organization_id,patient_identity_id,enrollment_intent_id,member_id,request_key,action,before_member,after_member,result)
    SELECT p_org,i.patient_identity_id,i.id,member.id,p_key,CASE p_decision WHEN 'APPROVED' THEN 'APPROVE' ELSE 'REJECT' END,before_row,to_jsonb(current_member),result
    FROM public.sales_patient_family_draft_members current_member WHERE id=member.id;
  INSERT INTO public.sales_history(organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
    VALUES(p_org,'opportunity',i.opportunity_id,p_actor,'family.preparation_reviewed',p_key,jsonb_build_object('intentId',i.id,'preparedMemberId',member.id,'decision',p_decision,'coverageActive',false));
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_review_family_preparation(uuid,uuid,uuid,uuid,text,timestamptz,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_review_family_preparation(uuid,uuid,uuid,uuid,text,timestamptz,uuid) TO service_role;

CREATE FUNCTION public.native_sales_family_quote_valid(p_intent uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE i public.sales_patient_enrollment_intents%ROWTYPE; q record; snapshot jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RETURN false; END IF;
  SELECT * INTO i FROM public.sales_patient_enrollment_intents WHERE id=p_intent;
  IF NOT FOUND THEN RETURN false; END IF;
  IF i.family_policy_version IS NULL AND i.additional_member_count=0 THEN RETURN true; END IF;
  IF i.membership_type<>'FAMILY' OR i.family_policy_version IS DISTINCT FROM 'FAMILY_EXPANSION_V1' THEN RETURN false; END IF;
  IF i.purpose IN ('ENROLLMENT','RENEWAL') THEN
    SELECT * INTO q FROM public.native_sales_family_expanded_quote(i.plan,i.duration,i.additional_member_count,i.purpose='RENEWAL');
    RETURN i.amount_cents=q.total_cents AND i.family_base_amount_cents=q.base_cents AND i.family_additional_unit_cents=q.member_unit_cents
      AND i.initial_months=q.months AND i.family_pricing_snapshot=jsonb_build_object('version','FAMILY_EXPANSION_V1','baseCents',q.base_cents,
        'monthlyCents',q.monthly_member_cents,'perMemberCents',q.member_unit_cents,'totalCents',q.total_cents,'count',i.additional_member_count,'months',q.months,'additionalCents',q.additional_cents);
  ELSIF i.purpose='FAMILY_ADDITION' THEN
    snapshot:=public.native_sales_family_prorated_quote(i.family_membership_id,i.additional_member_count,(i.family_pricing_snapshot->>'asOf')::date);
    RETURN i.family_base_amount_cents=0 AND i.amount_cents=(snapshot->>'totalCents')::integer
      AND i.family_additional_unit_cents=(snapshot->>'perMemberCents')::integer AND i.family_pricing_snapshot=snapshot;
  END IF;
  RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_family_quote_valid(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_family_quote_valid(uuid) TO service_role;

CREATE FUNCTION public.native_sales_family_preparation_ready(p_intent uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE i public.sales_patient_enrollment_intents%ROWTYPE; identity public.sales_patient_identities%ROWTYPE;
DECLARE person record;
DECLARE prepared integer; unapproved integer; contact public.sales_contacts%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RETURN false; END IF;
  SELECT * INTO i FROM public.sales_patient_enrollment_intents WHERE id=p_intent;
  IF NOT FOUND THEN RETURN false; END IF;
  IF i.family_policy_version IS NULL THEN RETURN i.additional_member_count=0; END IF;
  IF i.purpose='RENEWAL' THEN RETURN true; END IF;
  SELECT * INTO identity FROM public.sales_patient_identities WHERE organization_id=i.organization_id AND id=i.patient_identity_id;
  SELECT * INTO contact FROM public.sales_contacts WHERE organization_id=i.organization_id AND id=identity.contact_id AND archived_at IS NULL;
  IF contact.id IS NULL THEN RETURN false; END IF;
  SELECT count(*),count(*) FILTER(WHERE d.review_status<>'APPROVED' OR d.reviewed_by IS NULL OR d.reviewed_at IS NULL
    OR d.authority_attested_at IS NULL OR d.authority_auth_id IS DISTINCT FROM identity.auth_id
    OR NOT public.native_sales_family_preparation_can_review(i.organization_id,d.reviewed_by,i.id))
    INTO prepared,unapproved FROM public.sales_patient_family_draft_members d
    WHERE d.organization_id=i.organization_id AND d.enrollment_intent_id=i.id AND d.patient_identity_id=identity.id AND d.status='DRAFT';
  IF prepared>0 AND (contact.phone IS NULL OR contact.phone !~ '^\+[1-9][0-9]{7,14}$' OR nullif(btrim(concat_ws(', ',contact.address->>'street',contact.address->>'city',contact.address->>'state',contact.address->>'postalCode',contact.address->>'country')),'') IS NULL) THEN RETURN false; END IF;
  FOR person IN SELECT d.reviewed_by,d.review_status,public.native_sales_family_existing_contact(i.organization_id,d.first_name,d.last_name,d.date_of_birth) AS existing_contact
    FROM public.sales_patient_family_draft_members d WHERE d.organization_id=i.organization_id AND d.enrollment_intent_id=i.id AND d.status='DRAFT' LOOP
    IF person.existing_contact=identity.contact_id THEN RETURN false; END IF;
    IF person.existing_contact IS NOT NULL AND person.review_status='APPROVED'
      AND public.native_sales_family_preparation_can_review(i.organization_id,person.reviewed_by,i.id)
      AND NOT EXISTS(SELECT 1 FROM public.native_sales_visible_crm(i.organization_id,person.reviewed_by,'contacts',1,0,NULL,person.existing_contact)) THEN RETURN false; END IF;
  END LOOP;
  RETURN unapproved=0 AND CASE WHEN i.purpose='FAMILY_ADDITION' THEN prepared=i.additional_member_count
    WHEN i.additional_member_count>0 THEN prepared=2+i.additional_member_count ELSE prepared BETWEEN 0 AND 2 END;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_family_preparation_ready(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_family_preparation_ready(uuid) TO service_role;

CREATE FUNCTION public.native_sales_family_invoice_snapshot_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE i public.sales_patient_enrollment_intents%ROWTYPE;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF (NEW.purpose,NEW.additional_member_count,NEW.family_base_amount_cents,NEW.family_additional_unit_cents,NEW.family_pricing_snapshot,NEW.family_policy_version)
      IS DISTINCT FROM (OLD.purpose,OLD.additional_member_count,OLD.family_base_amount_cents,OLD.family_additional_unit_cents,OLD.family_pricing_snapshot,OLD.family_policy_version) THEN
      RAISE EXCEPTION 'FAMILY_INVOICE_SNAPSHOT_IMMUTABLE' USING ERRCODE='42501'; END IF;
    RETURN NEW;
  END IF;
  -- BEFORE INSERT still runs for ON CONFLICT retries. Never block recovery of a prior job.
  IF EXISTS(SELECT 1 FROM public.sales_qbo_invoice_jobs WHERE organization_id=NEW.organization_id AND enrollment_intent_id=NEW.enrollment_intent_id) THEN RETURN NEW; END IF;
  SELECT * INTO i FROM public.sales_patient_enrollment_intents WHERE organization_id=NEW.organization_id AND id=NEW.enrollment_intent_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PATIENT_INTENT_NOT_BILLABLE' USING ERRCODE='22023'; END IF;
  IF i.family_policy_version IS NOT NULL THEN
    IF NOT public.native_sales_family_quote_valid(i.id) THEN RAISE EXCEPTION 'FAMILY_QUOTE_CHANGED' USING ERRCODE='22023'; END IF;
    IF NOT public.native_sales_family_preparation_ready(i.id) THEN RAISE EXCEPTION 'FAMILY_PREPARATION_REVIEW_REQUIRED' USING ERRCODE='42501'; END IF;
    IF i.purpose='FAMILY_ADDITION' AND (i.family_pricing_snapshot->>'asOf')::date<>greatest((now() AT TIME ZONE 'America/New_York')::date,(SELECT issued_at FROM public.sales_memberships WHERE organization_id=i.organization_id AND id=i.family_membership_id)) THEN
      RAISE EXCEPTION 'FAMILY_QUOTE_EXPIRED' USING ERRCODE='22023'; END IF;
  END IF;
  NEW.additional_member_count:=i.additional_member_count;NEW.family_base_amount_cents:=i.family_base_amount_cents;
  NEW.family_additional_unit_cents:=i.family_additional_unit_cents;NEW.family_pricing_snapshot:=i.family_pricing_snapshot;NEW.family_policy_version:=i.family_policy_version;
  RETURN NEW;
END;
$$;
CREATE TRIGGER aaa_family_invoice_snapshot_guard BEFORE INSERT OR UPDATE ON public.sales_qbo_invoice_jobs FOR EACH ROW EXECUTE FUNCTION public.native_sales_family_invoice_snapshot_guard();
REVOKE ALL ON FUNCTION public.native_sales_family_invoice_snapshot_guard() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.native_sales_family_intent_snapshot_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF (NEW.additional_member_count,NEW.family_membership_id,NEW.family_base_amount_cents,NEW.family_additional_unit_cents,NEW.family_pricing_snapshot,NEW.family_policy_version)
    IS DISTINCT FROM (OLD.additional_member_count,OLD.family_membership_id,OLD.family_base_amount_cents,OLD.family_additional_unit_cents,OLD.family_pricing_snapshot,OLD.family_policy_version)
    AND EXISTS(SELECT 1 FROM public.sales_qbo_invoice_jobs WHERE organization_id=OLD.organization_id AND enrollment_intent_id=OLD.id) THEN
    RAISE EXCEPTION 'FAMILY_INVOICE_SNAPSHOT_IMMUTABLE' USING ERRCODE='42501'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER family_intent_snapshot_guard BEFORE UPDATE ON public.sales_patient_enrollment_intents FOR EACH ROW EXECUTE FUNCTION public.native_sales_family_intent_snapshot_guard();
REVOKE ALL ON FUNCTION public.native_sales_family_intent_snapshot_guard() FROM PUBLIC,anon,authenticated;

-- Separate Opportunity and immutable billing intent: the already-paid invoice and
-- original membership never change when a patient requests additional people.
CREATE FUNCTION public.native_sales_patient_family_addition_opportunity(p_intent_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE i public.sales_patient_enrollment_intents%ROWTYPE;m public.sales_memberships%ROWTYPE;
DECLARE original public.sales_opportunities%ROWTYPE; stage public.sales_stages%ROWTYPE; op uuid;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'PATIENT_SERVER_ONLY' USING ERRCODE='42501'; END IF;
  SELECT * INTO i FROM public.sales_patient_enrollment_intents WHERE id=p_intent_id;
  SELECT * INTO m FROM public.sales_memberships WHERE organization_id=i.organization_id AND id=i.family_membership_id FOR UPDATE;
  IF i.purpose IS DISTINCT FROM 'FAMILY_ADDITION' OR m.id IS NULL OR m.is_demo OR m.status<>'ACTIVE'
    OR m.primary_contact_id IS DISTINCT FROM (SELECT contact_id FROM public.sales_patient_identities WHERE organization_id=i.organization_id AND id=i.patient_identity_id)
    OR (m.plan,m.membership_type,m.duration) IS DISTINCT FROM (i.plan,i.membership_type,i.duration)
    OR NOT public.native_sales_family_quote_valid(i.id) THEN
    RAISE EXCEPTION 'FAMILY_ADDITION_MEMBERSHIP_MISMATCH' USING ERRCODE='42501'; END IF;
  SELECT * INTO original FROM public.sales_opportunities WHERE organization_id=i.organization_id AND id=m.opportunity_id AND archived_at IS NULL;
  SELECT s.* INTO stage FROM public.sales_stages s JOIN public.sales_pipelines p ON p.organization_id=s.organization_id AND p.id=s.pipeline_id
    WHERE p.organization_id=i.organization_id AND p.code='PATIENT_ENROLLMENT' AND p.active AND s.code='PAYMENT_PENDING';
  IF original.id IS NULL OR stage.id IS NULL THEN RAISE EXCEPTION 'FAMILY_WORKSPACE_UNAVAILABLE'; END IF;
  INSERT INTO public.sales_opportunities(organization_id,owner_member_id,team_id,name,account_id,primary_contact_id,
    stage_id,probability,currency,amount,expected_close_date,source,product,created_by,updated_by)
  VALUES(i.organization_id,m.seller_member_id,m.team_id,'Corazón Salud additional family members '||i.id::text,original.account_id,m.primary_contact_id,
    stage.id,stage.probability,'USD',i.amount_cents::numeric/100,(i.family_pricing_snapshot->>'asOf')::date,
    'Patient Portal','Corazón Salud',m.created_by,m.created_by) RETURNING id INTO op;
  INSERT INTO public.sales_opportunity_contacts(organization_id,opportunity_id,contact_id) VALUES(i.organization_id,op,m.primary_contact_id);
  UPDATE public.sales_patient_enrollment_intents SET opportunity_id=op WHERE id=i.id;
  INSERT INTO public.sales_history(organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
  VALUES(i.organization_id,'membership',m.id,m.created_by,'family.addition_requested',i.id,
    jsonb_build_object('intentId',i.id,'opportunityId',op,'quote',i.family_pricing_snapshot));
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_patient_family_addition_opportunity(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_family_addition_opportunity(uuid) TO service_role;

CREATE FUNCTION public.native_sales_patient_family_addition_action(p_identity_id uuid,p_membership_id uuid,p_action text,p_count integer,p_key uuid,p_expected_intent uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE identity public.sales_patient_identities%ROWTYPE;m public.sales_memberships%ROWTYPE;i public.sales_patient_enrollment_intents%ROWTYPE;
DECLARE result jsonb; event public.sales_patient_selection_events%ROWTYPE; quote jsonb;active_people integer;additional_people integer;
DECLARE today date:=(now() AT TIME ZONE 'America/New_York')::date;before_state jsonb;lost uuid;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'PATIENT_SERVER_ONLY' USING ERRCODE='42501'; END IF;
  IF p_key IS NULL OR p_membership_id IS NULL OR p_action IS NULL OR p_action NOT IN ('CREATE','UPDATE','REFRESH','CANCEL')
    OR p_count IS NULL OR p_count NOT BETWEEN 1 AND 9 THEN RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE='22023'; END IF;
  SELECT * INTO identity FROM public.sales_patient_identities WHERE id=p_identity_id
    AND organization_id='9efab353-46a0-43d1-9901-e3f185dc5d30' FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=identity.auth_id AND email_confirmed_at IS NOT NULL)
    OR NOT EXISTS(SELECT 1 FROM public.sales_organizations WHERE id=identity.organization_id AND status='active')
    OR NOT EXISTS(SELECT 1 FROM public.sales_contacts WHERE organization_id=identity.organization_id AND id=identity.contact_id AND archived_at IS NULL) THEN
    RAISE EXCEPTION 'PATIENT_IDENTITY_NOT_FOUND' USING ERRCODE='42501'; END IF;
  SELECT * INTO m FROM public.sales_memberships WHERE organization_id=identity.organization_id AND id=p_membership_id AND primary_contact_id=identity.contact_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'MEMBERSHIP_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  SELECT * INTO event FROM public.sales_patient_selection_events WHERE patient_identity_id=identity.id AND request_key=p_key;
  IF FOUND THEN
    IF event.after_selection->>'operation' IS DISTINCT FROM p_action OR event.after_selection->>'membershipId' IS DISTINCT FROM m.id::text
      OR (event.after_selection->>'count')::integer IS DISTINCT FROM p_count THEN RAISE EXCEPTION 'PATIENT_IDEMPOTENCY_CONFLICT' USING ERRCODE='23505'; END IF;
    RETURN event.result||jsonb_build_object('replayed',true);
  END IF;
  SELECT * INTO i FROM public.sales_patient_enrollment_intents WHERE patient_identity_id=identity.id AND idempotency_key=p_key;
  IF FOUND THEN
    IF p_action<>'CREATE' OR i.purpose<>'FAMILY_ADDITION' OR i.family_membership_id<>m.id OR i.additional_member_count<>p_count THEN
      RAISE EXCEPTION 'PATIENT_IDEMPOTENCY_CONFLICT' USING ERRCODE='23505'; END IF;
    RETURN to_jsonb(i)||jsonb_build_object('replayed',true);
  END IF;
  today:=greatest(today,m.issued_at);
  IF m.is_demo OR m.status<>'ACTIVE' OR m.membership_type<>'FAMILY' OR m.expires_at<=today THEN
    RAISE EXCEPTION 'FAMILY_ADDITION_NOT_ELIGIBLE' USING ERRCODE='22023'; END IF;
  SELECT count(*),count(*) FILTER(WHERE is_additional) INTO active_people,additional_people
    FROM public.sales_household_members WHERE organization_id=m.organization_id AND membership_id=m.id AND status='ACTIVE';
  SELECT * INTO i FROM public.sales_patient_enrollment_intents WHERE patient_identity_id=identity.id
    AND purpose='FAMILY_ADDITION' AND family_membership_id=m.id AND status NOT IN ('CANCELLED','FULFILLED') FOR UPDATE;
  IF p_action='CREATE' AND FOUND THEN
    IF i.additional_member_count<>p_count THEN RAISE EXCEPTION 'FAMILY_ADDITION_ALREADY_PENDING' USING ERRCODE='23505'; END IF;
    RETURN to_jsonb(i)||jsonb_build_object('replayed',true);
  END IF;
  IF p_action<>'CREATE' AND i.id IS NULL THEN RAISE EXCEPTION 'FAMILY_ADDITION_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  IF p_action<>'CREATE' AND p_expected_intent IS NOT NULL AND p_expected_intent IS DISTINCT FROM i.id THEN RAISE EXCEPTION 'FAMILY_ADDITION_CHANGED' USING ERRCODE='40001'; END IF;
  IF i.id IS NOT NULL AND EXISTS(SELECT 1 FROM public.sales_qbo_invoice_jobs WHERE organization_id=i.organization_id AND enrollment_intent_id=i.id) THEN
    RAISE EXCEPTION 'PATIENT_PAYMENT_LOCKED' USING ERRCODE='42501'; END IF;
  IF p_action='CANCEL' THEN
    before_state:=to_jsonb(i);
    SELECT s.id INTO lost FROM public.sales_stages s JOIN public.sales_pipelines p ON p.organization_id=s.organization_id AND p.id=s.pipeline_id
      WHERE p.organization_id=i.organization_id AND p.code='PATIENT_ENROLLMENT' AND s.code='LOST';
    IF lost IS NULL THEN RAISE EXCEPTION 'FAMILY_WORKSPACE_UNAVAILABLE'; END IF;
    UPDATE public.sales_patient_enrollment_intents SET status='CANCELLED' WHERE id=i.id;
    UPDATE public.sales_opportunities SET stage_id=lost,probability=0,lost_reason='Patient cancelled additional family members before invoice',
      version=version+1,updated_at=now() WHERE organization_id=i.organization_id AND id=i.opportunity_id;
    result:=jsonb_build_object('intentId',i.id,'status','CANCELLED');
  ELSE
    -- Included B/C places use the existing approved, no-additional-fee workflow.
    IF active_people-additional_people<3 THEN RAISE EXCEPTION 'FAMILY_INCLUDED_PLACES_AVAILABLE' USING ERRCODE='22023'; END IF;
    IF p_count+additional_people>9 OR active_people+p_count>12 THEN RAISE EXCEPTION 'HOUSEHOLD_LIMIT_REACHED' USING ERRCODE='22023'; END IF;
    IF EXISTS(SELECT 1 FROM public.sales_patient_enrollment_intents WHERE patient_identity_id=identity.id AND id IS DISTINCT FROM i.id
      AND status NOT IN ('CANCELLED','FULFILLED')) THEN RAISE EXCEPTION 'PATIENT_SELECTION_ALREADY_EXISTS' USING ERRCODE='23505'; END IF;
    quote:=public.native_sales_family_prorated_quote(m.id,p_count,today);
    IF p_action='CREATE' THEN
      INSERT INTO public.sales_patient_enrollment_intents(organization_id,patient_identity_id,plan,membership_type,duration,initial_months,amount_cents,status,idempotency_key,
        purpose,family_membership_id,additional_member_count,family_policy_version,family_base_amount_cents,family_additional_unit_cents,family_pricing_snapshot)
      VALUES(m.organization_id,identity.id,m.plan,'FAMILY',m.duration,1,(quote->>'totalCents')::integer,'PAYMENT_UNAVAILABLE',p_key,
        'FAMILY_ADDITION',m.id,p_count,'FAMILY_EXPANSION_V1',0,(quote->>'perMemberCents')::integer,quote) RETURNING * INTO i;
    ELSE
      IF (SELECT count(*) FROM public.sales_patient_family_draft_members WHERE organization_id=i.organization_id AND enrollment_intent_id=i.id AND status='DRAFT')>p_count THEN
        RAISE EXCEPTION 'FAMILY_REMOVE_DETAILS_FIRST' USING ERRCODE='22023'; END IF;
      IF p_action='REFRESH' AND i.additional_member_count<>p_count THEN RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE='22023'; END IF;
      before_state:=to_jsonb(i);
      UPDATE public.sales_patient_enrollment_intents SET additional_member_count=p_count,amount_cents=(quote->>'totalCents')::integer,
        family_additional_unit_cents=(quote->>'perMemberCents')::integer,family_pricing_snapshot=quote WHERE id=i.id;
      UPDATE public.sales_opportunities SET amount=(quote->>'totalCents')::numeric/100,version=version+1,updated_at=now() WHERE organization_id=i.organization_id AND id=i.opportunity_id;
      result:=jsonb_build_object('intentId',i.id,'status',i.status);
    END IF;
  END IF;
  IF p_action='CREATE' THEN
    SELECT * INTO i FROM public.sales_patient_enrollment_intents WHERE id=i.id;
    RETURN to_jsonb(i)||jsonb_build_object('replayed',false);
  END IF;
  INSERT INTO public.sales_patient_selection_events(organization_id,patient_identity_id,enrollment_intent_id,request_key,action,before_selection,after_selection,result)
  VALUES(i.organization_id,identity.id,i.id,p_key,CASE WHEN p_action='CANCEL' THEN 'CANCEL' ELSE 'CHANGE' END,before_state,
    jsonb_build_object('operation',p_action,'membershipId',m.id,'count',p_count),result);
  INSERT INTO public.sales_history(organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
  VALUES(i.organization_id,'membership',m.id,m.created_by,'family.addition_'||lower(p_action),p_key,
    jsonb_build_object('intentId',i.id,'quote',quote));
  RETURN result||jsonb_build_object('replayed',false);
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_patient_family_addition_action(uuid,uuid,text,integer,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_family_addition_action(uuid,uuid,text,integer,uuid,uuid) TO service_role;

-- Historical sequence and active capacity are different concepts: removed codes
-- remain reserved forever. Spreadsheet-style suffixes continue after Z.
CREATE FUNCTION public.native_sales_family_suffix(p_index integer) RETURNS text
LANGUAGE plpgsql IMMUTABLE STRICT SET search_path=public,pg_temp AS $$
DECLARE result text:='';n integer:=p_index;
BEGIN
  IF n<1 OR n>32767 THEN RAISE EXCEPTION 'HOUSEHOLD_CODE_EXHAUSTED' USING ERRCODE='22023'; END IF;
  WHILE n>0 LOOP n:=n-1;result:=chr(65+n%26)||result;n:=n/26;END LOOP;
  RETURN result;
END;
$$;
CREATE FUNCTION public.native_sales_family_suffix_index(p_suffix text) RETURNS integer
LANGUAGE plpgsql IMMUTABLE STRICT SET search_path=public,pg_temp AS $$
DECLARE result integer:=0; c text;
BEGIN
  IF p_suffix !~ '^[A-Z]{1,4}$' THEN RAISE EXCEPTION 'HOUSEHOLD_CODE_INVALID' USING ERRCODE='22023'; END IF;
  FOREACH c IN ARRAY regexp_split_to_array(p_suffix,'') LOOP
    result:=result*26+ascii(c)-64;
    IF result>32767 THEN RAISE EXCEPTION 'HOUSEHOLD_CODE_EXHAUSTED' USING ERRCODE='22023'; END IF;
  END LOOP;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_family_suffix(integer),public.native_sales_family_suffix_index(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_family_suffix(integer),public.native_sales_family_suffix_index(text) TO service_role;
DO $$ DECLARE c record;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='public.sales_household_members'::regclass AND contype='c'
    AND position('member_index' in pg_get_constraintdef(oid))>0 LOOP
    EXECUTE format('ALTER TABLE public.sales_household_members DROP CONSTRAINT %I',c.conname);
  END LOOP;
END;$$;
ALTER TABLE public.sales_household_members ADD CHECK(member_index>=1);

CREATE OR REPLACE FUNCTION public.native_sales_household_assign_member_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE root text;
BEGIN
  SELECT code INTO root FROM public.sales_memberships WHERE organization_id=NEW.organization_id AND id=NEW.membership_id FOR UPDATE;
  IF root IS NULL OR NEW.member_index<1 THEN RAISE EXCEPTION 'HOUSEHOLD_CODE_INVALID' USING ERRCODE='22023'; END IF;
  IF NEW.relationship='PRIMARY' AND NEW.member_index=1 THEN NEW.member_code:=root||' A';
  ELSIF NEW.relationship<>'PRIMARY' AND NEW.member_index>1 AND NEW.code=root||' '||public.native_sales_family_suffix(NEW.member_index) THEN NEW.member_code:=NEW.code;
  ELSE RAISE EXCEPTION 'HOUSEHOLD_CODE_INVALID' USING ERRCODE='22023'; END IF;
  RETURN NEW;
END;$$;

CREATE FUNCTION public.native_sales_family_paid_preparation_valid(p_request uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT auth.role()='service_role' AND EXISTS(
  SELECT 1 FROM public.sales_family_requests r
  JOIN public.sales_patient_family_draft_members d ON d.organization_id=r.organization_id AND d.id=r.prepared_member_id
  JOIN public.sales_patient_enrollment_intents i ON i.organization_id=r.organization_id AND i.id=r.billing_intent_id AND i.id=d.enrollment_intent_id
  JOIN public.sales_patient_identities identity ON identity.organization_id=i.organization_id AND identity.id=i.patient_identity_id AND identity.id=d.patient_identity_id
  JOIN public.sales_memberships m ON m.organization_id=r.organization_id AND m.id=r.membership_id AND m.id=i.membership_id AND m.primary_contact_id=identity.contact_id
  JOIN public.sales_patient_qbo_manual q ON q.organization_id=i.organization_id AND q.enrollment_intent_id=i.id AND q.opportunity_id=i.opportunity_id
  JOIN public.sales_payments p ON p.organization_id=q.organization_id AND p.id=q.sales_payment_id AND p.opportunity_id=i.opportunity_id
  WHERE r.id=p_request AND i.family_policy_version='FAMILY_EXPANSION_V1' AND i.purpose IN ('ENROLLMENT','FAMILY_ADDITION') AND i.status='FULFILLED'
    AND (i.purpose='ENROLLMENT' OR i.family_membership_id=m.id)
    AND NOT m.is_demo AND m.status='ACTIVE' AND NOT p.is_demo AND p.currency='USD' AND p.amount*100=i.amount_cents AND p.paid_at<=current_date
    AND NOT q.qa_synthetic AND q.integration_mode='AUTO_QBO' AND q.verification_state='PAYMENT_VERIFIED' AND q.finance_verification_status='VERIFIED'
    AND q.qbo_invoice_status='PAID' AND q.qbo_payment_status IN ('PAID','VERIFIED') AND q.qbo_payment_confirmed_at<=now()
    AND q.qbo_payment_verified_at IS NOT NULL AND public.native_sales_patient_qbo_owner(q.qbo_payment_verified_by)
    AND q.base_invoice_amount_cents=i.amount_cents AND public.native_sales_family_quote_valid(i.id)
    AND public.native_sales_patient_invoice_agreement_valid(i.id)
    AND d.review_status='APPROVED' AND d.reviewed_at IS NOT NULL AND d.authority_attested_at IS NOT NULL AND d.authority_auth_id=identity.auth_id
    AND public.native_sales_family_preparation_can_review(i.organization_id,d.reviewed_by,i.id)
    AND (d.first_name,d.last_name,d.date_of_birth,d.relationship)=(r.first_name,r.last_name,r.date_of_birth,r.relationship)
    AND ((i.purpose='ENROLLMENT' AND m.sales_payment_id=p.id) OR (i.purpose='FAMILY_ADDITION' AND (i.family_pricing_snapshot->>'expiresAt')::date=m.expires_at))
 );
$$;
REVOKE ALL ON FUNCTION public.native_sales_family_paid_preparation_valid(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_family_paid_preparation_valid(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.native_sales_review_family_member(
  p_organization_id uuid,p_actor_member_id uuid,p_membership_id uuid,
  p_family_request_id uuid,p_decision text,p_request_id uuid
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_actor public.sales_members%ROWTYPE;
DECLARE v_membership public.sales_memberships%ROWTYPE;
DECLARE v_request public.sales_family_requests%ROWTYPE;
DECLARE v_contact public.sales_contacts%ROWTYPE;
DECLARE v_slot integer;
DECLARE v_household_id uuid;
DECLARE v_code_number bigint;
DECLARE v_code text;
DECLARE v_suffix integer;
DECLARE paid_preparation boolean;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  IF p_membership_id IS NULL OR p_family_request_id IS NULL OR p_request_id IS NULL
    OR p_decision IS NULL OR p_decision NOT IN ('APPROVED','REJECTED') THEN
    RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE='22023';
  END IF;
  SELECT m.* INTO v_actor FROM public.sales_members m
    JOIN public.sales_organizations o ON o.id=m.organization_id
    WHERE m.organization_id=p_organization_id AND m.id=p_actor_member_id
      AND m.status='active' AND o.status='active';
  IF NOT FOUND OR v_actor.role NOT IN ('SUPERADMIN','ADMINISTRATOR','SALES_MANAGER') THEN
    RAISE EXCEPTION 'FAMILY_APPROVAL_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_membership FROM public.sales_memberships
    WHERE organization_id=p_organization_id AND id=p_membership_id FOR UPDATE;
  IF NOT FOUND OR v_membership.membership_type<>'FAMILY' OR v_membership.is_demo
    OR v_membership.status<>'ACTIVE' OR v_membership.expires_at<current_date
    OR v_membership.sales_payment_id IS NULL OR v_membership.payment_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'FAMILY_MEMBERSHIP_NOT_ELIGIBLE' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_request FROM public.sales_family_requests
    WHERE organization_id=p_organization_id AND membership_id=p_membership_id
      AND id=p_family_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FAMILY_REQUEST_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  -- EMC managers may review requests only for their assigned EMC team.
  IF v_actor.role='SALES_MANAGER' AND (
    p_organization_id <> '9efab353-46a0-43d1-9901-e3f185dc5d30'::uuid
    OR NOT EXISTS (
      SELECT 1 FROM public.sales_team_members tm
      WHERE tm.organization_id=p_organization_id
        AND tm.member_id=p_actor_member_id
        AND tm.team_id=v_membership.team_id
    )
  ) THEN
    RAISE EXCEPTION 'FAMILY_APPROVAL_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  paid_preparation:=public.native_sales_family_paid_preparation_valid(v_request.id);
  IF v_request.status='APPROVED' AND paid_preparation AND v_request.issued_household_member_id IS NOT NULL AND p_decision='APPROVED' THEN
    RETURN jsonb_build_object('id',v_request.id,'status','APPROVED','householdMemberId',v_request.issued_household_member_id,'replayed',true); END IF;
  IF v_request.status<>'PENDING' THEN
    RAISE EXCEPTION 'FAMILY_REQUEST_ALREADY_REVIEWED' USING ERRCODE='23505';
  END IF;
  IF p_decision='REJECTED' THEN
    UPDATE public.sales_family_requests SET status='REJECTED',reviewed_by=p_actor_member_id,
      reviewed_at=now(),updated_at=now() WHERE id=v_request.id;
  ELSE
    IF v_request.additional_fee_review AND NOT paid_preparation THEN
      RAISE EXCEPTION 'ADDITIONAL_MEMBER_PRICE_NOT_CONFIGURED' USING ERRCODE='22023';
    END IF;
    SELECT * INTO v_contact FROM public.sales_contacts
      WHERE organization_id=p_organization_id AND id=v_request.requested_contact_id AND archived_at IS NULL;
    IF NOT FOUND OR nullif(btrim(v_contact.first_name),'') IS NULL
      OR nullif(btrim(v_contact.last_name),'') IS NULL OR v_contact.phone IS NULL
      OR v_contact.phone !~ '^\+[1-9][0-9]{7,14}$'
      OR v_contact.date_of_birth IS NULL
      OR nullif(btrim(concat_ws(', ',v_contact.address->>'street',v_contact.address->>'city',
        v_contact.address->>'state',v_contact.address->>'postalCode',v_contact.address->>'country')),'') IS NULL THEN
      RAISE EXCEPTION 'DEPENDENT_CONTACT_DETAILS_REQUIRED' USING ERRCODE='22023';
    END IF;
    IF EXISTS (SELECT 1 FROM public.sales_memberships m
      WHERE m.organization_id=p_organization_id AND m.primary_contact_id=v_contact.id
        AND m.status='ACTIVE' AND m.expires_at>=current_date)
      OR EXISTS (SELECT 1 FROM public.sales_household_members h
        JOIN public.sales_memberships m ON m.organization_id=h.organization_id AND m.id=h.membership_id
        WHERE h.organization_id=p_organization_id AND h.contact_id=v_contact.id
          AND h.status='ACTIVE' AND m.status='ACTIVE' AND m.expires_at>=current_date) THEN
      RAISE EXCEPTION 'DEPENDENT_ALREADY_HAS_MEMBERSHIP' USING ERRCODE='22023';
    END IF;
    IF paid_preparation THEN
      IF (SELECT count(*) FROM public.sales_household_members WHERE organization_id=p_organization_id AND membership_id=p_membership_id AND status='ACTIVE' AND relationship<>'PRIMARY')>=11
        OR (v_request.additional_fee_review AND (SELECT count(*) FROM public.sales_household_members WHERE organization_id=p_organization_id AND membership_id=p_membership_id AND status='ACTIVE' AND is_additional)>=9) THEN
        RAISE EXCEPTION 'HOUSEHOLD_LIMIT_REACHED' USING ERRCODE='22023'; END IF;
    ELSIF (SELECT count(*) FROM public.sales_household_members WHERE organization_id=p_organization_id AND membership_id=p_membership_id AND status='ACTIVE' AND NOT is_additional AND relationship<>'PRIMARY')>=2 THEN
      RAISE EXCEPTION 'HOUSEHOLD_LIMIT_REACHED' USING ERRCODE='22023'; END IF;
    SELECT greatest(coalesce(max(h.member_index),1),1)+1 INTO v_slot FROM public.sales_household_members h
      WHERE h.organization_id=p_organization_id AND h.membership_id=p_membership_id;
    SELECT greatest(coalesce(max(public.native_sales_family_suffix_index(substr(h.member_code,length(v_membership.code)+2))),1),1)+1 INTO v_suffix
      FROM public.sales_household_members h WHERE h.organization_id=p_organization_id AND h.membership_id=p_membership_id AND h.member_code IS NOT NULL;
    v_slot:=greatest(v_slot,v_suffix);
    v_code:=v_membership.code||' '||public.native_sales_family_suffix(v_slot);
    v_code_number:=NULL;
    INSERT INTO public.sales_household_members
      (organization_id,membership_id,contact_id,relationship,status,member_index,
       approved_by,approved_at,code,code_number,is_additional,activation_intent_id,coverage_starts_at,included_visits)
      VALUES (p_organization_id,p_membership_id,v_contact.id,v_request.relationship,'ACTIVE',v_slot,
        p_actor_member_id,now(),v_code,v_code_number,paid_preparation AND v_request.additional_fee_review,
        CASE WHEN paid_preparation THEN v_request.billing_intent_id END,current_date,v_membership.included_visits) RETURNING id INTO v_household_id;
    INSERT INTO public.sales_membership_code_registry
      (code,code_number,organization_id,household_member_id)
      VALUES (v_code,v_code_number,p_organization_id,v_household_id);
    UPDATE public.sales_family_requests SET status='APPROVED',reviewed_by=p_actor_member_id,
      reviewed_at=now(),issued_household_member_id=v_household_id,updated_at=now()
      WHERE id=v_request.id;
  END IF;
  INSERT INTO public.sales_history
    (organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
    VALUES (p_organization_id,'family_request',v_request.id,p_actor_member_id,
      lower(p_decision),p_request_id,
      jsonb_build_object('membershipId',p_membership_id,'householdMemberId',v_household_id,
        'amountCents',0));
  RETURN jsonb_build_object('id',v_request.id,'status',p_decision,
    'householdMemberId',v_household_id,'code',v_code);
END;
$$;

CREATE FUNCTION public.native_sales_family_existing_contact(p_org uuid,p_first text,p_last text,p_dob date)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE matches integer;found_id uuid;c public.sales_contacts%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501'; END IF;
  SELECT count(*),(array_agg(id ORDER BY id))[1] INTO matches,found_id FROM public.sales_contacts
    WHERE organization_id=p_org AND lower(btrim(first_name))=lower(btrim(p_first)) AND lower(btrim(last_name))=lower(btrim(p_last)) AND date_of_birth=p_dob;
  IF matches>1 THEN RAISE EXCEPTION 'FAMILY_CONTACT_AMBIGUOUS' USING ERRCODE='22023'; END IF;
  IF found_id IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO c FROM public.sales_contacts WHERE id=found_id;
  IF c.archived_at IS NOT NULL OR c.phone IS NULL OR c.phone !~ '^\+[1-9][0-9]{7,14}$'
    OR nullif(btrim(concat_ws(', ',c.address->>'street',c.address->>'city',c.address->>'state',c.address->>'postalCode',c.address->>'country')),'') IS NULL THEN
    RAISE EXCEPTION 'DEPENDENT_CONTACT_DETAILS_REQUIRED' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.sales_memberships WHERE organization_id=p_org AND primary_contact_id=found_id AND status='ACTIVE' AND expires_at>=current_date)
    OR EXISTS(SELECT 1 FROM public.sales_household_members h JOIN public.sales_memberships m ON m.organization_id=h.organization_id AND m.id=h.membership_id
      WHERE h.organization_id=p_org AND h.contact_id=found_id AND h.status='ACTIVE' AND m.status='ACTIVE' AND m.expires_at>=current_date) THEN
    RAISE EXCEPTION 'DEPENDENT_ALREADY_HAS_MEMBERSHIP' USING ERRCODE='22023'; END IF;
  RETURN found_id;
END;$$;
REVOKE ALL ON FUNCTION public.native_sales_family_existing_contact(uuid,text,text,date) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_family_existing_contact(uuid,text,text,date) TO service_role;

CREATE OR REPLACE FUNCTION public.native_sales_patient_family_drafts_after_activation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE m public.sales_memberships%ROWTYPE;primary_contact public.sales_contacts%ROWTYPE;d public.sales_patient_family_draft_members%ROWTYPE;
DECLARE request public.sales_family_requests%ROWTYPE;contact_id uuid;position integer:=0;additional boolean;
BEGIN
  IF NEW.purpose='RENEWAL' OR NEW.status<>'FULFILLED' OR NEW.membership_type<>'FAMILY' OR NEW.membership_id IS NULL OR OLD.status='FULFILLED' THEN RETURN NEW; END IF;
  SELECT * INTO m FROM public.sales_memberships WHERE organization_id=NEW.organization_id AND id=NEW.membership_id
    AND status='ACTIVE' AND NOT is_demo AND sales_payment_id IS NOT NULL AND payment_confirmed_at IS NOT NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PATIENT_FAMILY_ACTIVATION_UNVERIFIED' USING ERRCODE='42501'; END IF;
  IF NEW.family_policy_version IS NULL THEN
    -- Existing paid/in-flight selections retain their original staff queue.
    INSERT INTO public.sales_family_requests(organization_id,membership_id,requested_by,patient_identity_id,
      first_name,last_name,date_of_birth,relationship,idempotency_key,additional_fee_review)
    SELECT legacy_draft.organization_id,NEW.membership_id,m.created_by,legacy_draft.patient_identity_id,legacy_draft.first_name,legacy_draft.last_name,legacy_draft.date_of_birth,legacy_draft.relationship,'family-draft-'||legacy_draft.id::text,false
      FROM public.sales_patient_family_draft_members legacy_draft WHERE legacy_draft.organization_id=NEW.organization_id AND legacy_draft.patient_identity_id=NEW.patient_identity_id AND legacy_draft.enrollment_intent_id=NEW.id AND legacy_draft.status='DRAFT'
      ON CONFLICT DO NOTHING;
    RETURN NEW;
  END IF;
  IF NOT public.native_sales_family_preparation_ready(NEW.id) THEN RAISE EXCEPTION 'FAMILY_PREPARATION_REVIEW_REQUIRED' USING ERRCODE='42501'; END IF;
  SELECT * INTO primary_contact FROM public.sales_contacts WHERE organization_id=m.organization_id AND id=m.primary_contact_id;
  FOR d IN SELECT * FROM public.sales_patient_family_draft_members WHERE organization_id=NEW.organization_id AND patient_identity_id=NEW.patient_identity_id
    AND enrollment_intent_id=NEW.id AND status='DRAFT' ORDER BY created_at,id LOOP
    position:=position+1;additional:=NEW.purpose='FAMILY_ADDITION' OR position>2;
    SELECT * INTO request FROM public.sales_family_requests WHERE organization_id=NEW.organization_id AND prepared_member_id=d.id FOR UPDATE;
    IF FOUND THEN
      IF request.billing_intent_id<>NEW.id OR request.membership_id<>m.id OR request.status<>'APPROVED' OR request.issued_household_member_id IS NULL THEN
        RAISE EXCEPTION 'FAMILY_ACTIVATION_CONFLICT' USING ERRCODE='42501'; END IF;
      CONTINUE;
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.organization_id::text||':'||lower(btrim(d.first_name))||':'||lower(btrim(d.last_name))||':'||d.date_of_birth::text,0));
    contact_id:=public.native_sales_family_existing_contact(NEW.organization_id,d.first_name,d.last_name,d.date_of_birth);
    IF contact_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.native_sales_visible_crm(NEW.organization_id,d.reviewed_by,'contacts',1,0,NULL,contact_id)) THEN
      RAISE EXCEPTION 'FAMILY_CONTACT_SCOPE_CHANGED' USING ERRCODE='42501'; END IF;
    IF contact_id IS NULL THEN
      INSERT INTO public.sales_contacts(organization_id,owner_member_id,team_id,display_name,first_name,last_name,date_of_birth,phone,address,
        source,corazon_salud,plan,product,created_by,updated_by)
      VALUES(NEW.organization_id,m.seller_member_id,m.team_id,d.first_name||' '||d.last_name,d.first_name,d.last_name,d.date_of_birth,primary_contact.phone,primary_contact.address,
        'PATIENT_PORTAL',true,m.plan,'Corazón Salud',d.reviewed_by,d.reviewed_by) RETURNING id INTO contact_id;
    END IF;
    INSERT INTO public.sales_family_requests(organization_id,membership_id,requested_by,requested_contact_id,patient_identity_id,
      first_name,last_name,date_of_birth,relationship,idempotency_key,additional_fee_review,billing_intent_id,prepared_member_id)
    VALUES(NEW.organization_id,m.id,d.reviewed_by,contact_id,d.patient_identity_id,d.first_name,d.last_name,d.date_of_birth,d.relationship,
      'family-draft-'||d.id::text,additional,NEW.id,d.id) RETURNING * INTO request;
    IF NOT public.native_sales_family_paid_preparation_valid(request.id) THEN RAISE EXCEPTION 'FAMILY_PAYMENT_NOT_VERIFIED' USING ERRCODE='42501'; END IF;
    PERFORM public.native_sales_review_family_member(NEW.organization_id,d.reviewed_by,m.id,request.id,'APPROVED',d.id);
  END LOOP;
  RETURN NEW;
END;$$;

CREATE OR REPLACE FUNCTION public.native_sales_patient_invoice_agreement_valid(p_intent_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT auth.role()='service_role' AND EXISTS (
    SELECT 1 FROM public.sales_patient_enrollment_intents i
    JOIN public.sales_patient_identities pi ON pi.organization_id=i.organization_id AND pi.id=i.patient_identity_id
    JOIN public.sales_patient_agreement_acceptances a ON a.organization_id=i.organization_id
      AND a.patient_identity_id=i.patient_identity_id AND a.contact_id=pi.contact_id AND a.auth_id=pi.auth_id
      AND a.agreement_version=i.required_agreement_version
      AND a.plan=i.plan AND a.membership_type=i.membership_type AND a.duration=i.duration
    WHERE i.id=p_intent_id AND i.required_agreement_version='v5' AND (
      (a.enrollment_intent_id=i.id AND a.opportunity_id=i.opportunity_id AND a.amount_cents=i.amount_cents)
      OR (i.purpose IN ('RENEWAL','FAMILY_ADDITION') AND (i.purpose='FAMILY_ADDITION' OR a.id=i.renewal_agreement_acceptance_id) AND EXISTS (
        SELECT 1 FROM public.sales_patient_enrollment_intents prior
        WHERE prior.organization_id=i.organization_id AND prior.id=a.enrollment_intent_id
          AND prior.status='FULFILLED' AND prior.membership_id=CASE WHEN i.purpose='FAMILY_ADDITION' THEN i.family_membership_id ELSE i.renewal_membership_id END))));
$$;

CREATE OR REPLACE FUNCTION public.native_sales_qbo_agreement_gate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  -- ON CONFLICT DO NOTHING still executes BEFORE INSERT triggers. An existing
  -- job predating v5 must be recoverable without fabricating past acceptance.
  IF TG_OP='UPDATE' AND
    (NEW.state IS DISTINCT FROM 'INVOICE_WRITE_STARTED' OR
     OLD.state='INVOICE_WRITE_STARTED') THEN RETURN NEW; END IF;
  IF TG_OP='INSERT' AND EXISTS (SELECT 1 FROM public.sales_qbo_invoice_jobs j
      WHERE j.organization_id=NEW.organization_id
        AND j.enrollment_intent_id=NEW.enrollment_intent_id) THEN RETURN NEW; END IF;
  IF NOT public.native_sales_patient_invoice_agreement_valid(NEW.enrollment_intent_id)
    OR NOT EXISTS(SELECT 1 FROM public.sales_patient_enrollment_intents i
      JOIN public.sales_patient_identities identity ON identity.organization_id=i.organization_id AND identity.id=i.patient_identity_id
      WHERE i.id=NEW.enrollment_intent_id AND i.organization_id=NEW.organization_id
        AND i.patient_identity_id=NEW.patient_identity_id AND identity.contact_id=NEW.contact_id
        AND i.opportunity_id=NEW.opportunity_id AND i.plan=NEW.plan AND i.membership_type=NEW.membership_type
        AND i.duration=NEW.duration AND i.amount_cents=NEW.amount_cents AND i.purpose=NEW.purpose
        AND i.additional_member_count=NEW.additional_member_count AND i.family_policy_version IS NOT DISTINCT FROM NEW.family_policy_version
        AND i.family_base_amount_cents IS NOT DISTINCT FROM NEW.family_base_amount_cents AND i.family_additional_unit_cents IS NOT DISTINCT FROM NEW.family_additional_unit_cents
        AND i.family_pricing_snapshot IS NOT DISTINCT FROM NEW.family_pricing_snapshot) THEN
    RAISE EXCEPTION 'PATIENT_AGREEMENT_REQUIRED' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;

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
DECLARE family_intent public.sales_patient_enrollment_intents%ROWTYPE;
BEGIN
  IF EXISTS(SELECT 1 FROM public.sales_payments p JOIN public.sales_patient_enrollment_intents i
    ON i.organization_id=p.organization_id AND i.opportunity_id=p.opportunity_id
    WHERE p.organization_id=p_organization_id AND p.id=p_payment_id AND i.purpose IN ('RENEWAL','FAMILY_ADDITION')) THEN
    RAISE EXCEPTION 'RENEWAL_USE_VERIFIED_EXTENSION' USING ERRCODE='42501'; END IF;
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
  SELECT * INTO family_intent FROM public.sales_patient_enrollment_intents WHERE organization_id=p_organization_id AND opportunity_id=v_payment.opportunity_id
    AND purpose='ENROLLMENT' AND family_policy_version='FAMILY_EXPANSION_V1';
  IF FOUND THEN
    IF (family_intent.plan,family_intent.membership_type,family_intent.duration) IS DISTINCT FROM (p_plan,p_membership_type,p_duration)
      OR NOT public.native_sales_family_quote_valid(family_intent.id) OR (family_intent.status<>'FULFILLED' AND NOT public.native_sales_family_preparation_ready(family_intent.id)) THEN
      RAISE EXCEPTION 'FAMILY_ACTIVATION_QUOTE_MISMATCH' USING ERRCODE='42501'; END IF;
    v_quote.total_cents:=family_intent.amount_cents;
    v_quote.monthly_cents:=v_quote.monthly_cents+(family_intent.family_pricing_snapshot->>'monthlyCents')::integer*family_intent.additional_member_count;
  END IF;
  IF v_payment.currency<>'USD'  OR v_payment.amount*100<>v_quote.total_cents
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

CREATE OR REPLACE FUNCTION public.native_sales_patient_request_online_renewal(p_identity_id uuid,p_membership_id uuid,p_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE identity public.sales_patient_identities%ROWTYPE;
DECLARE m public.sales_memberships%ROWTYPE;
DECLARE existing public.sales_patient_enrollment_intents%ROWTYPE;
DECLARE quote record; evidence uuid; expanded record; extra integer:=0; snapshot jsonb;
DECLARE today date:=(now() AT TIME ZONE 'America/New_York')::date;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'PATIENT_SERVER_ONLY' USING ERRCODE='42501'; END IF;
  IF p_key IS NULL OR p_membership_id IS NULL THEN RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE='22023'; END IF;
  SELECT * INTO identity FROM public.sales_patient_identities WHERE id=p_identity_id
    AND organization_id='9efab353-46a0-43d1-9901-e3f185dc5d30' FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=identity.auth_id AND email_confirmed_at IS NOT NULL)
    OR NOT EXISTS(SELECT 1 FROM public.sales_organizations WHERE id=identity.organization_id AND status='active')
    OR NOT EXISTS(SELECT 1 FROM public.sales_contacts WHERE organization_id=identity.organization_id AND id=identity.contact_id AND archived_at IS NULL) THEN
    RAISE EXCEPTION 'PATIENT_IDENTITY_NOT_FOUND' USING ERRCODE='42501'; END IF;
  SELECT * INTO m FROM public.sales_memberships WHERE organization_id=identity.organization_id
    AND id=p_membership_id AND primary_contact_id=identity.contact_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'MEMBERSHIP_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  SELECT * INTO existing FROM public.sales_patient_enrollment_intents WHERE patient_identity_id=identity.id AND idempotency_key=p_key;
  IF FOUND THEN
    IF existing.purpose<>'RENEWAL' OR existing.renewal_membership_id<>m.id THEN
      RAISE EXCEPTION 'PATIENT_IDEMPOTENCY_CONFLICT' USING ERRCODE='23505'; END IF;
    RETURN to_jsonb(existing)||jsonb_build_object('replayed',true);
  END IF;
  IF m.is_demo OR m.status NOT IN ('ACTIVE','EXPIRED') OR m.expires_at>today+30
    OR m.duration NOT IN ('MONTHLY','3M','6M','12M') OR m.plan NOT IN ('ESSENTIAL','PLUS','MAX')
    OR m.membership_type NOT IN ('INDIVIDUAL','FAMILY') THEN
    RAISE EXCEPTION 'RENEWAL_NOT_ELIGIBLE' USING ERRCODE='22023'; END IF;
  SELECT * INTO existing FROM public.sales_patient_enrollment_intents WHERE organization_id=m.organization_id
    AND renewal_membership_id=m.id AND purpose='RENEWAL' AND status NOT IN ('CANCELLED','FULFILLED');
  IF FOUND THEN RETURN to_jsonb(existing)||jsonb_build_object('replayed',true); END IF;
  IF EXISTS(SELECT 1 FROM public.sales_patient_enrollment_intents WHERE patient_identity_id=identity.id
    AND status IN ('PAYMENT_UNAVAILABLE','PAYMENT_PENDING','CHANGE_REQUESTED','CANCELLATION_REQUESTED')) THEN
    RAISE EXCEPTION 'PATIENT_SELECTION_ALREADY_EXISTS' USING ERRCODE='23505'; END IF;
  SELECT * INTO quote FROM public.native_sales_renewal_quote(m.plan,m.membership_type,m.duration);
  IF m.membership_type='FAMILY' THEN
    SELECT count(*) INTO extra FROM public.sales_household_members WHERE organization_id=m.organization_id AND membership_id=m.id AND status='ACTIVE' AND is_additional;
    SELECT * INTO expanded FROM public.native_sales_family_expanded_quote(m.plan,m.duration,extra,true);
    quote.total_cents:=expanded.total_cents;quote.months:=expanded.months;
    snapshot:=jsonb_build_object('version','FAMILY_EXPANSION_V1','baseCents',expanded.base_cents,'monthlyCents',expanded.monthly_member_cents,
      'perMemberCents',expanded.member_unit_cents,'totalCents',expanded.total_cents,'count',extra,'months',expanded.months,'additionalCents',expanded.additional_cents);
  END IF;
  SELECT a.id INTO evidence FROM public.sales_patient_agreement_acceptances a
    JOIN public.sales_patient_enrollment_intents prior ON prior.organization_id=a.organization_id AND prior.id=a.enrollment_intent_id
    WHERE a.organization_id=m.organization_id AND a.patient_identity_id=identity.id AND a.auth_id=identity.auth_id
      AND a.contact_id=m.primary_contact_id AND prior.membership_id=m.id AND prior.status='FULFILLED'
      AND a.agreement_version='v5' AND a.plan=m.plan AND a.membership_type=m.membership_type AND a.duration=m.duration
    ORDER BY a.accepted_at DESC,a.id DESC LIMIT 1;
  INSERT INTO public.sales_patient_enrollment_intents(organization_id,patient_identity_id,plan,membership_type,duration,
    initial_months,amount_cents,status,idempotency_key,purpose,renewal_membership_id,renewal_base_expires_at,renewal_agreement_acceptance_id,additional_member_count,family_policy_version,family_base_amount_cents,family_additional_unit_cents,family_pricing_snapshot)
  VALUES(m.organization_id,identity.id,m.plan,m.membership_type,m.duration,quote.months,quote.total_cents,
    'PAYMENT_UNAVAILABLE',p_key,'RENEWAL',m.id,m.expires_at,evidence,extra,CASE WHEN snapshot IS NOT NULL THEN 'FAMILY_EXPANSION_V1' END,
    (snapshot->>'baseCents')::integer,(snapshot->>'perMemberCents')::integer,snapshot) RETURNING * INTO existing;
  SELECT * INTO existing FROM public.sales_patient_enrollment_intents WHERE id=existing.id;
  IF existing.opportunity_id IS NULL THEN RAISE EXCEPTION 'RENEWAL_OPPORTUNITY_NOT_CREATED'; END IF;
  RETURN to_jsonb(existing)||jsonb_build_object('replayed',false);
END;
$$;
CREATE OR REPLACE FUNCTION public.native_sales_patient_renewal_opportunity(p_intent_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE i public.sales_patient_enrollment_intents%ROWTYPE;
DECLARE m public.sales_memberships%ROWTYPE;
DECLARE original public.sales_opportunities%ROWTYPE;
DECLARE stage public.sales_stages%ROWTYPE;
DECLARE op uuid;
DECLARE quote record; expanded record;
BEGIN
  SELECT * INTO i FROM public.sales_patient_enrollment_intents WHERE id=p_intent_id;
  SELECT * INTO m FROM public.sales_memberships WHERE organization_id=i.organization_id AND id=i.renewal_membership_id;
  IF i.purpose IS DISTINCT FROM 'RENEWAL' OR m.id IS NULL OR m.is_demo
    OR m.primary_contact_id IS DISTINCT FROM (SELECT contact_id FROM public.sales_patient_identities WHERE id=i.patient_identity_id)
    OR (m.plan,m.membership_type,m.duration,m.expires_at) IS DISTINCT FROM
       (i.plan,i.membership_type,i.duration,i.renewal_base_expires_at) THEN
    RAISE EXCEPTION 'RENEWAL_MEMBERSHIP_MISMATCH' USING ERRCODE='22023'; END IF;
  SELECT * INTO quote FROM public.native_sales_renewal_quote(i.plan,i.membership_type,i.duration);
  IF i.family_policy_version IS NOT NULL THEN
    IF NOT public.native_sales_family_quote_valid(i.id) THEN RAISE EXCEPTION 'FAMILY_QUOTE_CHANGED' USING ERRCODE='22023'; END IF;
    SELECT * INTO expanded FROM public.native_sales_family_expanded_quote(i.plan,i.duration,i.additional_member_count,true);
    quote.total_cents:=expanded.total_cents;quote.months:=expanded.months;
  END IF;
  IF quote.total_cents IS DISTINCT FROM i.amount_cents OR quote.months IS DISTINCT FROM i.initial_months::integer THEN
    RAISE EXCEPTION 'RENEWAL_QUOTE_MISMATCH' USING ERRCODE='22023'; END IF;
  SELECT * INTO original FROM public.sales_opportunities WHERE organization_id=i.organization_id AND id=m.opportunity_id AND archived_at IS NULL;
  SELECT s.* INTO stage FROM public.sales_stages s JOIN public.sales_pipelines p ON p.organization_id=s.organization_id AND p.id=s.pipeline_id
    WHERE p.organization_id=i.organization_id AND p.code='PATIENT_ENROLLMENT' AND p.active AND s.code='PAYMENT_PENDING';
  IF original.id IS NULL OR stage.id IS NULL THEN RAISE EXCEPTION 'RENEWAL_WORKSPACE_UNAVAILABLE'; END IF;
  INSERT INTO public.sales_opportunities(organization_id,owner_member_id,team_id,name,account_id,primary_contact_id,
    stage_id,probability,currency,amount,expected_close_date,source,product,created_by,updated_by)
  VALUES(i.organization_id,m.seller_member_id,m.team_id,'Corazón Salud renewal '||i.id::text,original.account_id,m.primary_contact_id,
    stage.id,stage.probability,'USD',i.amount_cents::numeric/100,greatest(current_date,m.expires_at),
    'Patient Portal','Corazón Salud',m.created_by,m.created_by) RETURNING id INTO op;
  INSERT INTO public.sales_opportunity_contacts(organization_id,opportunity_id,contact_id) VALUES(i.organization_id,op,m.primary_contact_id);
  UPDATE public.sales_patient_enrollment_intents SET opportunity_id=op WHERE id=i.id;
  INSERT INTO public.sales_history(organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
    VALUES(i.organization_id,'membership',m.id,m.created_by,'renewal.intent_created',i.id,
      jsonb_build_object('intentId',i.id,'opportunityId',op,'amountCents',i.amount_cents,'baseExpiresAt',m.expires_at,
        'agreementEvidenceId',i.renewal_agreement_acceptance_id));
END;
$$;
CREATE OR REPLACE FUNCTION public.native_sales_patient_complete_renewal(p_intent_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE i public.sales_patient_enrollment_intents%ROWTYPE;
DECLARE m public.sales_memberships%ROWTYPE;
DECLARE q public.sales_patient_qbo_manual%ROWTYPE;
DECLARE payment public.sales_payments%ROWTYPE;
DECLARE quote record; expanded record; starts date; ends date; won uuid;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'PATIENT_SERVER_ONLY' USING ERRCODE='42501'; END IF;
  SELECT * INTO i FROM public.sales_patient_enrollment_intents WHERE id=p_intent_id
    AND purpose='RENEWAL' AND organization_id='9efab353-46a0-43d1-9901-e3f185dc5d30' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'RENEWAL_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  SELECT * INTO m FROM public.sales_memberships WHERE organization_id=i.organization_id AND id=i.renewal_membership_id FOR UPDATE;
  IF NOT FOUND OR m.is_demo OR m.primary_contact_id IS DISTINCT FROM
    (SELECT contact_id FROM public.sales_patient_identities WHERE organization_id=i.organization_id AND id=i.patient_identity_id) THEN
    RAISE EXCEPTION 'RENEWAL_MEMBERSHIP_MISMATCH' USING ERRCODE='42501'; END IF;
  IF i.status='FULFILLED' AND i.membership_id=m.id AND i.renewed_at IS NOT NULL THEN
    RETURN jsonb_build_object('membershipId',m.id,'code',m.code,'startsAt',i.renewal_starts_at,'expiresAt',i.renewal_expires_at,'replayed',true);
  END IF;
  IF i.status NOT IN ('PAYMENT_UNAVAILABLE','PAYMENT_PENDING') OR m.status NOT IN ('ACTIVE','EXPIRED')
    OR m.expires_at IS DISTINCT FROM i.renewal_base_expires_at
    OR (m.plan,m.membership_type,m.duration) IS DISTINCT FROM (i.plan,i.membership_type,i.duration)
    OR NOT public.native_sales_patient_invoice_agreement_valid(i.id) THEN
    RAISE EXCEPTION 'RENEWAL_STATE_CHANGED' USING ERRCODE='42501'; END IF;
  SELECT * INTO q FROM public.sales_patient_qbo_manual WHERE organization_id=i.organization_id AND enrollment_intent_id=i.id FOR UPDATE;
  IF NOT FOUND OR q.qa_synthetic OR q.integration_mode<>'AUTO_QBO'
    OR q.verification_state<>'PAYMENT_VERIFIED' OR q.finance_verification_status<>'VERIFIED'
    OR q.qbo_invoice_status<>'PAID' OR q.qbo_payment_status NOT IN ('PAID','VERIFIED')
    OR q.qbo_payment_confirmed_at IS NULL OR q.qbo_payment_confirmed_at>now()
    OR q.qbo_payment_verified_at IS NULL OR q.qbo_payment_verified_by IS NULL
    OR NOT public.native_sales_patient_qbo_owner(q.qbo_payment_verified_by)
    OR q.base_invoice_amount_cents<>i.amount_cents OR q.opportunity_id<>i.opportunity_id THEN
    RAISE EXCEPTION 'RENEWAL_PAYMENT_NOT_VERIFIED' USING ERRCODE='42501'; END IF;
  SELECT * INTO payment FROM public.sales_payments WHERE organization_id=i.organization_id AND id=q.sales_payment_id FOR UPDATE;
  IF NOT FOUND OR payment.is_demo OR payment.opportunity_id<>i.opportunity_id OR payment.currency<>'USD'
    OR payment.amount*100<>i.amount_cents OR payment.paid_at>current_date
    OR EXISTS(SELECT 1 FROM public.sales_memberships WHERE organization_id=i.organization_id AND sales_payment_id=payment.id)
    OR EXISTS(SELECT 1 FROM public.sales_membership_periods WHERE organization_id=i.organization_id AND sales_payment_id=payment.id) THEN
    RAISE EXCEPTION 'RENEWAL_PAYMENT_MISMATCH' USING ERRCODE='42501'; END IF;
  SELECT * INTO quote FROM public.native_sales_renewal_quote(i.plan,i.membership_type,i.duration);
  IF i.family_policy_version IS NOT NULL THEN
    IF NOT public.native_sales_family_quote_valid(i.id) THEN RAISE EXCEPTION 'FAMILY_QUOTE_CHANGED' USING ERRCODE='22023'; END IF;
    SELECT * INTO expanded FROM public.native_sales_family_expanded_quote(i.plan,i.duration,i.additional_member_count,true);
    quote.total_cents:=expanded.total_cents;quote.months:=expanded.months;
  END IF;
  IF quote.total_cents IS DISTINCT FROM i.amount_cents OR quote.months IS DISTINCT FROM i.initial_months::integer THEN
    RAISE EXCEPTION 'RENEWAL_QUOTE_MISMATCH' USING ERRCODE='22023'; END IF;
  IF i.additional_member_count<>(SELECT count(*) FROM public.sales_household_members WHERE organization_id=m.organization_id AND membership_id=m.id AND status='ACTIVE' AND is_additional) THEN
    RAISE EXCEPTION 'FAMILY_RENEWAL_HOUSEHOLD_CHANGED' USING ERRCODE='42501'; END IF;
  starts:=greatest(m.expires_at,payment.paid_at);
  ends:=public.native_sales_add_membership_months(starts,quote.months);
  SELECT s.id INTO won FROM public.sales_stages s JOIN public.sales_pipelines p ON p.organization_id=s.organization_id AND p.id=s.pipeline_id
    WHERE p.organization_id=i.organization_id AND p.code='PATIENT_ENROLLMENT' AND p.active AND s.code='WON';
  IF won IS NULL THEN RAISE EXCEPTION 'RENEWAL_WORKSPACE_UNAVAILABLE'; END IF;
  INSERT INTO public.sales_membership_periods(organization_id,membership_id,starts_at,expires_at,plan,duration,amount_cents,renewal_intent_id,sales_payment_id)
    VALUES(i.organization_id,m.id,starts,ends,i.plan,i.duration,i.amount_cents,i.id,payment.id);
  UPDATE public.sales_patient_enrollment_intents SET membership_id=m.id,status='FULFILLED',
    renewal_starts_at=starts,renewal_expires_at=ends,renewed_at=now() WHERE id=i.id;
  UPDATE public.sales_memberships SET expires_at=ends,status='ACTIVE',updated_at=now(),version=version+1 WHERE id=m.id AND organization_id=i.organization_id;
  UPDATE public.sales_patient_qbo_manual SET membership_activation_status='ACTIVE',updated_at=now() WHERE id=q.id;
  UPDATE public.sales_opportunities SET stage_id=won,probability=100,actual_close_date=payment.paid_at,
    updated_at=now(),version=version+1 WHERE organization_id=i.organization_id AND id=i.opportunity_id;
  INSERT INTO public.sales_history(organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
    VALUES(i.organization_id,'membership',m.id,q.qbo_payment_verified_by,'renewal.activated',i.id,
      jsonb_build_object('intentId',i.id,'paymentId',payment.id,'previousExpiresAt',m.expires_at,'startsAt',starts,'expiresAt',ends,'code',m.code));
  RETURN jsonb_build_object('membershipId',m.id,'code',m.code,'startsAt',starts,'expiresAt',ends,'replayed',false);
END;
$$;

CREATE OR REPLACE FUNCTION public.native_sales_patient_complete_family_addition(p_intent_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE i public.sales_patient_enrollment_intents%ROWTYPE;
DECLARE m public.sales_memberships%ROWTYPE;
DECLARE q public.sales_patient_qbo_manual%ROWTYPE;
DECLARE payment public.sales_payments%ROWTYPE;
DECLARE quote record; starts date; ends date; won uuid;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'PATIENT_SERVER_ONLY' USING ERRCODE='42501'; END IF;
  SELECT * INTO i FROM public.sales_patient_enrollment_intents WHERE id=p_intent_id
    AND purpose='FAMILY_ADDITION' AND organization_id='9efab353-46a0-43d1-9901-e3f185dc5d30' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FAMILY_ADDITION_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  SELECT * INTO m FROM public.sales_memberships WHERE organization_id=i.organization_id AND id=i.family_membership_id FOR UPDATE;
  IF NOT FOUND OR m.is_demo OR m.primary_contact_id IS DISTINCT FROM
    (SELECT contact_id FROM public.sales_patient_identities WHERE organization_id=i.organization_id AND id=i.patient_identity_id) THEN
    RAISE EXCEPTION 'FAMILY_ADDITION_MEMBERSHIP_MISMATCH' USING ERRCODE='42501'; END IF;
  IF i.status='FULFILLED' AND i.membership_id=m.id THEN
    RETURN jsonb_build_object('membershipId',m.id,'code',m.code,'expiresAt',m.expires_at,'replayed',true);
  END IF;
  IF i.status NOT IN ('PAYMENT_UNAVAILABLE','PAYMENT_PENDING') OR m.status<>'ACTIVE' OR m.membership_type<>'FAMILY'
    OR m.expires_at IS DISTINCT FROM (i.family_pricing_snapshot->>'expiresAt')::date OR m.expires_at<=(now() AT TIME ZONE 'America/New_York')::date
    OR (m.plan,m.membership_type,m.duration) IS DISTINCT FROM (i.plan,i.membership_type,i.duration)
    OR NOT public.native_sales_patient_invoice_agreement_valid(i.id) THEN
    RAISE EXCEPTION 'FAMILY_ADDITION_STATE_CHANGED' USING ERRCODE='42501'; END IF;
  SELECT * INTO q FROM public.sales_patient_qbo_manual WHERE organization_id=i.organization_id AND enrollment_intent_id=i.id FOR UPDATE;
  IF NOT FOUND OR q.qa_synthetic OR q.integration_mode<>'AUTO_QBO'
    OR q.verification_state<>'PAYMENT_VERIFIED' OR q.finance_verification_status<>'VERIFIED'
    OR q.qbo_invoice_status<>'PAID' OR q.qbo_payment_status NOT IN ('PAID','VERIFIED')
    OR q.qbo_payment_confirmed_at IS NULL OR q.qbo_payment_confirmed_at>now()
    OR q.qbo_payment_verified_at IS NULL OR q.qbo_payment_verified_by IS NULL
    OR NOT public.native_sales_patient_qbo_owner(q.qbo_payment_verified_by)
    OR q.base_invoice_amount_cents<>i.amount_cents OR q.opportunity_id<>i.opportunity_id THEN
    RAISE EXCEPTION 'FAMILY_ADDITION_PAYMENT_NOT_VERIFIED' USING ERRCODE='42501'; END IF;
  SELECT * INTO payment FROM public.sales_payments WHERE organization_id=i.organization_id AND id=q.sales_payment_id FOR UPDATE;
  IF NOT FOUND OR payment.is_demo OR payment.opportunity_id<>i.opportunity_id OR payment.currency<>'USD'
    OR payment.amount*100<>i.amount_cents OR payment.paid_at>current_date
    OR EXISTS(SELECT 1 FROM public.sales_memberships WHERE organization_id=i.organization_id AND sales_payment_id=payment.id)
    OR EXISTS(SELECT 1 FROM public.sales_membership_periods WHERE organization_id=i.organization_id AND sales_payment_id=payment.id)
    OR EXISTS(SELECT 1 FROM public.sales_patient_qbo_manual other_q JOIN public.sales_patient_enrollment_intents other_i ON other_i.organization_id=other_q.organization_id AND other_i.id=other_q.enrollment_intent_id
      WHERE other_q.organization_id=i.organization_id AND other_q.sales_payment_id=payment.id AND other_i.status='FULFILLED' AND other_i.id<>i.id) THEN
    RAISE EXCEPTION 'FAMILY_ADDITION_PAYMENT_MISMATCH' USING ERRCODE='42501'; END IF;
  IF NOT public.native_sales_family_quote_valid(i.id) OR NOT public.native_sales_family_preparation_ready(i.id) THEN
    RAISE EXCEPTION 'FAMILY_PREPARATION_REVIEW_REQUIRED' USING ERRCODE='42501'; END IF;
  IF (SELECT count(*) FROM public.sales_household_members WHERE organization_id=m.organization_id AND membership_id=m.id AND status='ACTIVE')+i.additional_member_count>12
    OR (SELECT count(*) FROM public.sales_household_members WHERE organization_id=m.organization_id AND membership_id=m.id AND status='ACTIVE' AND is_additional)+i.additional_member_count>9 THEN
    RAISE EXCEPTION 'HOUSEHOLD_LIMIT_REACHED' USING ERRCODE='22023'; END IF;
  SELECT s.id INTO won FROM public.sales_stages s JOIN public.sales_pipelines p ON p.organization_id=s.organization_id AND p.id=s.pipeline_id
    WHERE p.organization_id=i.organization_id AND p.code='PATIENT_ENROLLMENT' AND p.active AND s.code='WON';
  IF won IS NULL THEN RAISE EXCEPTION 'FAMILY_ADDITION_WORKSPACE_UNAVAILABLE'; END IF;
  UPDATE public.sales_patient_enrollment_intents SET membership_id=m.id,status='FULFILLED' WHERE id=i.id;
  UPDATE public.sales_memberships SET updated_at=now(),version=version+1 WHERE id=m.id AND organization_id=i.organization_id;
  UPDATE public.sales_patient_qbo_manual SET membership_activation_status='ACTIVE',updated_at=now() WHERE id=q.id;
  UPDATE public.sales_opportunities SET stage_id=won,probability=100,actual_close_date=payment.paid_at,
    updated_at=now(),version=version+1 WHERE organization_id=i.organization_id AND id=i.opportunity_id;
  INSERT INTO public.sales_history(organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
    VALUES(i.organization_id,'membership',m.id,q.qbo_payment_verified_by,'family.addition_activated',i.id,
      jsonb_build_object('intentId',i.id,'paymentId',payment.id,'quote',i.family_pricing_snapshot,'expiresAt',m.expires_at,'code',m.code));
  RETURN jsonb_build_object('membershipId',m.id,'code',m.code,'expiresAt',m.expires_at,'replayed',false);
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_patient_complete_family_addition(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_complete_family_addition(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.native_sales_patient_follow_up_intent()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_identity public.sales_patient_identities%ROWTYPE;
DECLARE v_lead public.sales_leads%ROWTYPE;
DECLARE v_hours integer;
DECLARE v_action text;
BEGIN
  -- Supplemental household billing is not a new Lead or seller-distribution event.
  IF NEW.purpose='FAMILY_ADDITION' THEN RETURN NEW; END IF;
  IF NEW.purpose='RENEWAL' THEN
    IF NEW.status='CANCELLED' THEN
      UPDATE public.sales_opportunities SET stage_id=(SELECT s.id FROM public.sales_stages s
        JOIN public.sales_pipelines p ON p.organization_id=s.organization_id AND p.id=s.pipeline_id
        WHERE s.organization_id=NEW.organization_id AND p.code='PATIENT_ENROLLMENT' AND p.active AND s.code='LOST'),
        probability=0,lost_reason='Patient canceled renewal',actual_close_date=current_date,
        updated_at=now(),updated_by=owner_member_id,version=version+1
        WHERE organization_id=NEW.organization_id AND id=NEW.opportunity_id;
    END IF;
    IF NEW.status IN ('FULFILLED','CANCELLED') THEN
      UPDATE public.sales_activities SET status=CASE WHEN NEW.status='FULFILLED' THEN 'COMPLETED' ELSE 'CANCELLED' END,
        completed_at=CASE WHEN NEW.status='FULFILLED' THEN now() ELSE NULL END,updated_at=now()
        WHERE organization_id=NEW.organization_id AND idempotency_key='patient-renewal-'||NEW.id::text AND status='PENDING';
    ELSE
      INSERT INTO public.sales_activities(organization_id,kind,title,status,actor_member_id,assignee_member_id,contact_id,opportunity_id,due_at,idempotency_key)
        SELECT NEW.organization_id,'FOLLOW_UP','Follow up on membership renewal','PENDING',m.created_by,
          CASE WHEN EXISTS(SELECT 1 FROM public.sales_members sm WHERE sm.organization_id=m.organization_id AND sm.id=m.seller_member_id AND sm.status='active') THEN m.seller_member_id ELSE NULL END,
          m.primary_contact_id,(SELECT opportunity_id FROM public.sales_patient_enrollment_intents WHERE id=NEW.id),now()+interval '24 hours','patient-renewal-'||NEW.id::text
        FROM public.sales_memberships m WHERE m.organization_id=NEW.organization_id AND m.id=NEW.renewal_membership_id
        ON CONFLICT(organization_id,idempotency_key) DO NOTHING;
    END IF;
    RETURN NEW;
  END IF;
  SELECT * INTO v_identity FROM public.sales_patient_identities
    WHERE organization_id=NEW.organization_id AND id=NEW.patient_identity_id;
  IF NOT FOUND OR v_identity.lead_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO v_lead FROM public.sales_leads
    WHERE organization_id=NEW.organization_id AND id=v_identity.lead_id FOR UPDATE;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF NEW.status='FULFILLED' THEN
    UPDATE public.sales_activities SET status='COMPLETED',completed_at=now(),updated_at=now()
      WHERE organization_id=NEW.organization_id
        AND idempotency_key='patient-intent-'||NEW.id::text AND status='PENDING';
    UPDATE public.sales_leads SET next_action=NULL,next_follow_up_at=NULL,
      updated_at=now(),version=version+1 WHERE id=v_lead.id;
    RETURN NEW;
  END IF;
  IF NEW.status='CANCELLED' THEN
    UPDATE public.sales_activities SET status='CANCELLED',updated_at=now()
      WHERE organization_id=NEW.organization_id
        AND idempotency_key='patient-intent-'||NEW.id::text AND status='PENDING';
    v_action:='Contact patient about cancelled selection';
  ELSE
    v_action:=CASE WHEN NEW.membership_type='FAMILY'
      THEN 'Follow up on Family setup and pending payment'
      ELSE 'Follow up on pending invoice or payment' END;
    SELECT registration_follow_up_hours INTO v_hours
      FROM public.sales_patient_assignment_state WHERE organization_id=NEW.organization_id;
    INSERT INTO public.sales_activities
      (organization_id,kind,title,status,actor_member_id,assignee_member_id,
       lead_id,contact_id,opportunity_id,due_at,idempotency_key)
    VALUES (NEW.organization_id,'FOLLOW_UP','Follow up on Portal enrollment','PENDING',
      v_lead.owner_member_id,
      CASE WHEN EXISTS (SELECT 1 FROM public.sales_members m
        WHERE m.organization_id=NEW.organization_id AND m.id=v_lead.owner_member_id
          AND m.status='active' AND m.role='SELLER') THEN v_lead.owner_member_id ELSE NULL END,
      v_lead.id,v_identity.contact_id,
      (SELECT opportunity_id FROM public.sales_patient_enrollment_intents WHERE id=NEW.id),
      now()+make_interval(hours=>coalesce(v_hours,24)),
      'patient-intent-'||NEW.id::text)
    ON CONFLICT (organization_id,idempotency_key) DO NOTHING;
    UPDATE public.sales_activities SET status='COMPLETED',completed_at=now(),updated_at=now()
      WHERE organization_id=NEW.organization_id
        AND idempotency_key='patient-registration-'||v_identity.id::text AND status='PENDING';
  END IF;
  UPDATE public.sales_leads SET plan=NEW.plan,next_action=v_action,
    next_follow_up_at=CASE WHEN NEW.status='CANCELLED' THEN NULL
      ELSE coalesce(next_follow_up_at,now()+make_interval(hours=>coalesce(v_hours,24))) END,
    updated_at=now(),version=version+1 WHERE id=v_lead.id;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.native_sales_patient_family_addition_summary(p_identity_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE identity public.sales_patient_identities%ROWTYPE;m public.sales_memberships%ROWTYPE;i public.sales_patient_enrollment_intents%ROWTYPE;
DECLARE q public.sales_patient_qbo_manual%ROWTYPE;j public.sales_qbo_invoice_jobs%ROWTYPE;
DECLARE active_people integer;paid_people integer;included_people integer;available integer;quote jsonb;current_state jsonb;reason text;
DECLARE quote_date date; today date:=(now() AT TIME ZONE 'America/New_York')::date;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'PATIENT_SERVER_ONLY' USING ERRCODE='42501'; END IF;
  SELECT pi.* INTO identity FROM public.sales_patient_identities pi JOIN public.sales_organizations o ON o.id=pi.organization_id AND o.status='active'
    JOIN auth.users u ON u.id=pi.auth_id AND u.email_confirmed_at IS NOT NULL
    WHERE pi.id=p_identity_id AND pi.organization_id='9efab353-46a0-43d1-9901-e3f185dc5d30';
  IF NOT FOUND THEN RAISE EXCEPTION 'PATIENT_IDENTITY_NOT_FOUND' USING ERRCODE='42501'; END IF;
  SELECT * INTO m FROM public.sales_memberships WHERE organization_id=identity.organization_id AND primary_contact_id=identity.contact_id AND NOT is_demo
    ORDER BY created_at DESC,id DESC LIMIT 1;
  IF NOT FOUND OR m.membership_type<>'FAMILY' THEN RETURN NULL; END IF;
  quote_date:=greatest(today,m.issued_at);
  SELECT count(*),count(*) FILTER(WHERE is_additional),count(*) FILTER(WHERE NOT is_additional) INTO active_people,paid_people,included_people
    FROM public.sales_household_members WHERE organization_id=m.organization_id AND membership_id=m.id AND status='ACTIVE';
  available:=greatest(0,least(9-paid_people,12-active_people));
  reason:=CASE WHEN m.status<>'ACTIVE' OR m.expires_at<=quote_date THEN 'MEMBERSHIP_NOT_ACTIVE'
    WHEN included_people<3 THEN 'INCLUDED_PLACES_AVAILABLE' WHEN available=0 THEN 'HOUSEHOLD_LIMIT_REACHED'
    WHEN EXISTS(SELECT 1 FROM public.sales_patient_enrollment_intents WHERE patient_identity_id=identity.id AND purpose<>'FAMILY_ADDITION' AND status NOT IN ('CANCELLED','FULFILLED')) THEN 'BILLING_OPERATION_PENDING' END;
  IF reason IS NULL THEN quote:=public.native_sales_family_prorated_quote(m.id,1,quote_date); END IF;
  SELECT * INTO i FROM public.sales_patient_enrollment_intents WHERE organization_id=m.organization_id AND patient_identity_id=identity.id AND family_membership_id=m.id
    AND purpose='FAMILY_ADDITION' AND status NOT IN ('CANCELLED','FULFILLED') ORDER BY created_at DESC,id DESC LIMIT 1;
  IF FOUND THEN
    SELECT * INTO q FROM public.sales_patient_qbo_manual WHERE organization_id=i.organization_id AND enrollment_intent_id=i.id;
    SELECT * INTO j FROM public.sales_qbo_invoice_jobs WHERE organization_id=i.organization_id AND enrollment_intent_id=i.id;
    current_state:=jsonb_build_object('id',i.id,'status',i.status,'count',i.additional_member_count,'amountCents',i.amount_cents,
      'perMemberCents',i.family_additional_unit_cents,'quoteDate',i.family_pricing_snapshot->>'asOf',
      'quoteExpired',(i.family_pricing_snapshot->>'asOf')::date<>quote_date,'invoiceNumber',q.qbo_invoice_number,
      'invoiceStatus',q.qbo_invoice_status,'paymentStatus',q.qbo_payment_status,'hostedUrl',q.qbo_hosted_payment_url,'jobState',j.state,
      'approvalReady',public.native_sales_family_preparation_ready(i.id),'agreementSatisfied',public.native_sales_patient_invoice_agreement_valid(i.id),
      'completedAt',NULL,'members',(SELECT coalesce(jsonb_agg(to_jsonb(d) - 'organization_id' - 'patient_identity_id' - 'authority_auth_id' - 'reviewed_by' ORDER BY created_at,id),'[]'::jsonb)
        FROM public.sales_patient_family_draft_members d WHERE organization_id=i.organization_id AND enrollment_intent_id=i.id AND status='DRAFT'));
  END IF;
  RETURN jsonb_build_object('eligible',reason IS NULL,'reason',reason,'membershipId',m.id,'code',m.code,'plan',m.plan,'expiresAt',m.expires_at,
    'activePeople',active_people,'paidAdditionalPeople',paid_people,'availableAdditionalPlaces',available,'includedPlacesAvailable',greatest(0,3-included_people),
    'monthlyCents',(SELECT individual_monthly_cents FROM public.sales_membership_price_catalog WHERE plan=m.plan),
    'perMemberCents',coalesce((quote->>'perMemberCents')::integer,0),'quoteDate',quote_date,
    'quoteBreakdown',CASE WHEN quote IS NOT NULL THEN (quote->>'monthNumerator')||' / '||(quote->>'monthDenominator') ELSE '' END,
    'current',current_state);
END;$$;
REVOKE ALL ON FUNCTION public.native_sales_patient_family_addition_summary(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_family_addition_summary(uuid) TO service_role;

CREATE FUNCTION public.native_sales_family_preparation_status(p_org uuid,p_actor uuid,p_opportunity uuid,p_membership uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE i public.sales_patient_enrollment_intents%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' OR (p_opportunity IS NULL)=(p_membership IS NULL) THEN RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  IF p_opportunity IS NOT NULL THEN
    IF NOT EXISTS(SELECT 1 FROM public.native_sales_visible_crm(p_org,p_actor,'opportunities',1,0,NULL,p_opportunity)) THEN RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
    SELECT * INTO i FROM public.sales_patient_enrollment_intents WHERE organization_id=p_org AND opportunity_id=p_opportunity AND family_policy_version='FAMILY_EXPANSION_V1';
  ELSE
    IF NOT public.native_sales_family_access(p_org,p_actor,p_membership) THEN RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
    SELECT * INTO i FROM public.sales_patient_enrollment_intents WHERE organization_id=p_org AND family_membership_id=p_membership
      AND purpose='FAMILY_ADDITION' AND status NOT IN ('CANCELLED','FULFILLED') ORDER BY created_at DESC,id DESC LIMIT 1;
  END IF;
  IF i.id IS NULL THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('intentId',i.id,'purpose',i.purpose,'status',i.status,'additionalCount',i.additional_member_count,
    'baseCents',i.family_base_amount_cents,'additionalUnitCents',i.family_additional_unit_cents,'amountCents',i.amount_cents,
    'quote',i.family_pricing_snapshot,'approvalReady',CASE WHEN i.status='FULFILLED' THEN true ELSE public.native_sales_family_preparation_ready(i.id) END,
    'locked',EXISTS(SELECT 1 FROM public.sales_qbo_invoice_jobs WHERE organization_id=p_org AND enrollment_intent_id=i.id),
    'canReview',public.native_sales_family_preparation_can_review(p_org,p_actor,i.id),
    'members',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',d.id,'firstName',d.first_name,'lastName',d.last_name,'dateOfBirth',d.date_of_birth,
      'relationship',d.relationship,'reviewStatus',d.review_status,'updatedAt',d.updated_at,'authorityAttested',d.authority_attested_at IS NOT NULL) ORDER BY d.created_at,d.id),'[]'::jsonb)
      FROM public.sales_patient_family_draft_members d WHERE d.organization_id=p_org AND d.enrollment_intent_id=i.id AND d.status='DRAFT'));
END;$$;
REVOKE ALL ON FUNCTION public.native_sales_family_preparation_status(uuid,uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_family_preparation_status(uuid,uuid,uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.native_sales_visible_memberships(
  p_organization_id uuid,p_actor_member_id uuid,p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0,p_q text DEFAULT NULL,p_id uuid DEFAULT NULL,
  p_demo boolean DEFAULT NULL
) RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  IF p_limit NOT BETWEEN 1 AND 100 OR p_offset NOT BETWEEN 0 AND 100000
    OR length(coalesce(p_q,''))>160 THEN
    RAISE EXCEPTION 'INVALID_FILTER' USING ERRCODE='22023';
  END IF;
  SELECT m.role INTO v_role FROM public.sales_members m
    JOIN public.sales_organizations o ON o.id=m.organization_id
    WHERE m.organization_id=p_organization_id AND m.id=p_actor_member_id
      AND m.status='active' AND o.status='active';
  IF v_role IS NULL OR v_role='FINANCE' THEN
    RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE='42501';
  END IF;
  RETURN QUERY SELECT to_jsonb(m) || jsonb_build_object(
    'includedPeople',3,'paidAdditionalPeople',(SELECT count(*) FROM public.sales_household_members WHERE organization_id=m.organization_id AND membership_id=m.id AND status='ACTIVE' AND is_additional),
    'activePeople',(SELECT count(*) FROM public.sales_household_members WHERE organization_id=m.organization_id AND membership_id=m.id AND status='ACTIVE'),
    'effectiveStatus',CASE WHEN m.status='ACTIVE' AND m.expires_at<current_date
      THEN 'EXPIRED' ELSE m.status END,
    'household',coalesce((SELECT jsonb_agg(jsonb_build_object(
      'id',h.id,'contactId',h.contact_id,'displayName',c.display_name,
      'relationship',h.relationship,'status',h.status,'memberIndex',h.member_index,'isAdditional',h.is_additional,
      'includedVisits',coalesce(h.included_visits,m.included_visits),'coverageStartsAt',coalesce(h.coverage_starts_at,m.issued_at),
      'expiresAt',m.expires_at,'activationIntentId',h.activation_intent_id,
      'code',coalesce(h.member_code,h.code,CASE WHEN h.relationship='PRIMARY' THEN m.code||' A' END))
      ORDER BY h.member_index)
      FROM public.sales_household_members h
      JOIN public.sales_contacts c ON c.organization_id=h.organization_id AND c.id=h.contact_id
      WHERE h.organization_id=m.organization_id AND h.membership_id=m.id), '[]'::jsonb))
    FROM public.sales_memberships m
    WHERE m.organization_id=p_organization_id
      AND (p_id IS NULL OR m.id=p_id)
      AND (p_demo IS NULL OR m.is_demo=p_demo)
      AND (p_q IS NULL OR position(lower(p_q) in lower(m.code))>0
        OR position(lower(p_q) in lower(m.first_name || ' ' || m.last_name))>0)
      AND (v_role IN ('SUPERADMIN','ADMINISTRATOR','AUDITOR')
        OR m.seller_member_id=p_actor_member_id
        OR (v_role='SALES_MANAGER' AND m.team_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.sales_team_members tm
          WHERE tm.organization_id=p_organization_id AND tm.member_id=p_actor_member_id
            AND tm.team_id=m.team_id)))
    ORDER BY m.created_at DESC,m.id DESC LIMIT p_limit OFFSET p_offset;
END;
$$;
CREATE OR REPLACE FUNCTION public.native_sales_visible_payment_evidence(
  p_organization_id uuid,p_actor_member_id uuid,p_opportunity_id uuid
) RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  SELECT role INTO v_role FROM public.sales_members
    WHERE organization_id=p_organization_id AND id=p_actor_member_id AND status='active';
  IF v_role IS NULL OR v_role NOT IN ('SUPERADMIN','ADMINISTRATOR','SALES_MANAGER','SELLER','AUDITOR')
    OR p_opportunity_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.native_sales_visible_crm(
        p_organization_id,p_actor_member_id,'opportunities',1,0,NULL,p_opportunity_id)) THEN
    RAISE EXCEPTION 'OPPORTUNITY_NOT_FOUND' USING ERRCODE='P0002';
  END IF;
  RETURN QUERY SELECT to_jsonb(p) || jsonb_build_object('used',EXISTS (
    SELECT 1 FROM public.sales_memberships m WHERE m.organization_id=p_organization_id
      AND m.sales_payment_id=p.id) OR EXISTS (
    SELECT 1 FROM public.sales_membership_periods period WHERE period.organization_id=p_organization_id
      AND period.sales_payment_id=p.id) OR EXISTS(SELECT 1 FROM public.sales_patient_qbo_manual q JOIN public.sales_patient_enrollment_intents i ON i.organization_id=q.organization_id AND i.id=q.enrollment_intent_id
      WHERE q.organization_id=p_organization_id AND q.sales_payment_id=p.id AND i.purpose='FAMILY_ADDITION' AND i.status='FULFILLED'))
    FROM public.sales_payments p
    WHERE p.organization_id=p_organization_id AND p.opportunity_id=p_opportunity_id
    ORDER BY p.created_at DESC,p.id DESC LIMIT 100;
END;
$$;

-- Read-only billing history uses exactly the existing membership visibility gate.
CREATE FUNCTION public.native_sales_family_billing_history(p_org uuid,p_actor uuid,p_membership uuid)
RETURNS SETOF jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' OR NOT public.native_sales_family_access(p_org,p_actor,p_membership) THEN
    RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT jsonb_build_object('id',i.id,'purpose',i.purpose,'plan',i.plan,'type',i.membership_type,'duration',i.duration,
    'additionalCount',i.additional_member_count,'baseCents',i.family_base_amount_cents,'additionalUnitCents',i.family_additional_unit_cents,'amountCents',i.amount_cents,
    'status',i.status,'invoiceNumber',q.qbo_invoice_number,'invoiceStatus',q.qbo_invoice_status,'paymentStatus',q.qbo_payment_status,
    'quote',i.family_pricing_snapshot,'createdAt',i.created_at)
    FROM public.sales_patient_enrollment_intents i LEFT JOIN public.sales_patient_qbo_manual q ON q.organization_id=i.organization_id AND q.enrollment_intent_id=i.id
    WHERE i.organization_id=p_org AND i.family_policy_version='FAMILY_EXPANSION_V1'
      AND (i.membership_id=p_membership OR i.family_membership_id=p_membership OR i.renewal_membership_id=p_membership)
    ORDER BY i.created_at DESC,i.id DESC LIMIT 100;
END;$$;
REVOKE ALL ON FUNCTION public.native_sales_family_billing_history(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_family_billing_history(uuid,uuid,uuid) TO service_role;

CREATE FUNCTION public.native_sales_family_record_invoice_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE i public.sales_patient_enrollment_intents%ROWTYPE;
BEGIN
  IF NEW.qbo_invoice_number IS NULL THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND OLD.qbo_invoice_number IS NOT NULL THEN RETURN NEW; END IF;
  SELECT * INTO i FROM public.sales_patient_enrollment_intents WHERE organization_id=NEW.organization_id AND id=NEW.enrollment_intent_id FOR UPDATE;
  IF i.family_policy_version IS NULL THEN RETURN NEW; END IF;
  IF NOT public.native_sales_family_quote_valid(i.id) OR NOT public.native_sales_family_preparation_ready(i.id)
    OR NEW.base_invoice_amount_cents IS DISTINCT FROM i.amount_cents THEN RAISE EXCEPTION 'FAMILY_PREPARATION_REVIEW_REQUIRED' USING ERRCODE='42501'; END IF;
  -- This paid expansion path must retain its durable automatic invoice snapshot.
  IF NOT EXISTS(SELECT 1 FROM public.sales_qbo_invoice_jobs WHERE organization_id=i.organization_id AND enrollment_intent_id=i.id
    AND state IN ('INVOICE_CREATED','LINKED') AND amount_cents=i.amount_cents AND qbo_invoice_number=NEW.qbo_invoice_number) THEN
    RAISE EXCEPTION 'FAMILY_AUTOMATIC_INVOICE_REQUIRED' USING ERRCODE='42501'; END IF;
  RETURN NEW;
END;$$;
CREATE TRIGGER family_record_invoice_guard BEFORE INSERT OR UPDATE ON public.sales_patient_qbo_manual FOR EACH ROW EXECUTE FUNCTION public.native_sales_family_record_invoice_guard();
REVOKE ALL ON FUNCTION public.native_sales_family_record_invoice_guard() FROM PUBLIC,anon,authenticated;
