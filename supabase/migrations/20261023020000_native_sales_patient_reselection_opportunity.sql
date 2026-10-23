-- A cancelled, unbilled Portal selection may be reselected without creating a
-- second business Opportunity. Historical intents and their audit stay intact.
DROP INDEX public.sales_patient_intent_opportunity_unique;
CREATE UNIQUE INDEX sales_patient_intent_opportunity_unique
  ON public.sales_patient_enrollment_intents(organization_id,opportunity_id)
  WHERE opportunity_id IS NOT NULL AND status <> 'CANCELLED';

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
  IF NEW.organization_id<>'9efab353-46a0-43d1-9901-e3f185dc5d30' THEN RETURN NEW; END IF;
  SELECT * INTO v_identity FROM public.sales_patient_identities
    WHERE organization_id=NEW.organization_id AND id=NEW.patient_identity_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'PATIENT_IDENTITY_NOT_FOUND'; END IF;
  PERFORM public.native_sales_patient_ensure_lead(v_identity.id);
  SELECT * INTO v_contact FROM public.sales_contacts
    WHERE organization_id=NEW.organization_id AND id=v_identity.contact_id FOR UPDATE;
  SELECT * INTO v_quote FROM public.native_sales_membership_quote(
    NEW.plan,NEW.membership_type,NEW.duration);
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
      AND previous_intent.status='CANCELLED' AND previous_intent.membership_id IS NULL
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
REVOKE ALL ON FUNCTION public.native_sales_patient_intent_opportunity()
  FROM PUBLIC,anon,authenticated;
