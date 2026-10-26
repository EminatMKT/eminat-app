-- Scoped commercial reporting from native canonical rows. No accounting or
-- ANNIE runtime query is needed, and stage outcomes drive Won/Lost totals.
CREATE OR REPLACE FUNCTION public.native_sales_report_detail(
  p_organization_id uuid,p_actor_member_id uuid,p_from date,p_to date
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role text;
DECLARE v_result jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_to<p_from
    OR p_to-p_from>3660 THEN
    RAISE EXCEPTION 'INVALID_PERIOD' USING ERRCODE='22023';
  END IF;
  SELECT m.role INTO v_role FROM public.sales_members m
    JOIN public.sales_organizations o ON o.id=m.organization_id
    WHERE m.organization_id=p_organization_id AND m.id=p_actor_member_id
      AND m.status='active' AND o.status='active';
  IF v_role IS NULL OR v_role='FINANCE' THEN
    RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE='42501';
  END IF;
  WITH scoped_leads AS MATERIALIZED (
    SELECT l.id,l.status,l.source,l.owner_member_id,l.converted_at
    FROM public.sales_leads l
    WHERE l.organization_id=p_organization_id AND l.archived_at IS NULL
      AND l.created_at >= (p_from::timestamp AT TIME ZONE 'UTC')
      AND l.created_at < ((p_to+1)::timestamp AT TIME ZONE 'UTC')
      AND (v_role IN ('SUPERADMIN','ADMINISTRATOR','AUDITOR')
        OR l.owner_member_id=p_actor_member_id
        OR (v_role='SALES_MANAGER' AND EXISTS (
          SELECT 1 FROM public.sales_team_members tm
          WHERE tm.organization_id=p_organization_id AND tm.member_id=p_actor_member_id
            AND tm.team_id=l.team_id))
        OR EXISTS (SELECT 1 FROM public.sales_record_grants g
          WHERE g.organization_id=p_organization_id AND g.entity_type='lead'
            AND g.record_id=l.id AND g.member_id=p_actor_member_id AND g.revoked_at IS NULL))
  ), scoped_opportunities AS MATERIALIZED (
    SELECT o.id,s.code,s.name AS stage_name,s.outcome
    FROM public.sales_opportunities o
    JOIN public.sales_stages s ON s.organization_id=o.organization_id AND s.id=o.stage_id
    WHERE o.organization_id=p_organization_id AND o.archived_at IS NULL
      AND o.created_at >= (p_from::timestamp AT TIME ZONE 'UTC')
      AND o.created_at < ((p_to+1)::timestamp AT TIME ZONE 'UTC')
      AND (v_role IN ('SUPERADMIN','ADMINISTRATOR','AUDITOR')
        OR o.owner_member_id=p_actor_member_id
        OR (v_role='SALES_MANAGER' AND EXISTS (
          SELECT 1 FROM public.sales_team_members tm
          WHERE tm.organization_id=p_organization_id AND tm.member_id=p_actor_member_id
            AND tm.team_id=o.team_id))
        OR EXISTS (SELECT 1 FROM public.sales_record_grants g
          WHERE g.organization_id=p_organization_id AND g.entity_type='opportunity'
            AND g.record_id=o.id AND g.member_id=p_actor_member_id AND g.revoked_at IS NULL))
  ), scoped_memberships AS MATERIALIZED (
    SELECT m.id,m.plan,m.duration,m.seller_member_id,m.amount,m.currency
    FROM public.sales_memberships m
    WHERE m.organization_id=p_organization_id AND NOT m.is_demo
      AND m.sale_date BETWEEN p_from AND p_to
      AND (v_role IN ('SUPERADMIN','ADMINISTRATOR','AUDITOR')
        OR m.seller_member_id=p_actor_member_id
        OR (v_role='SALES_MANAGER' AND EXISTS (
          SELECT 1 FROM public.sales_team_members tm
          WHERE tm.organization_id=p_organization_id AND tm.member_id=p_actor_member_id
            AND tm.team_id=m.team_id)))
  ), scoped_renewals AS MATERIALIZED (
    SELECT period.id,period.amount_cents
    FROM public.sales_membership_periods period
    JOIN public.sales_memberships m ON m.organization_id=period.organization_id AND m.id=period.membership_id
    JOIN public.sales_payments payment ON payment.organization_id=period.organization_id AND payment.id=period.sales_payment_id
    JOIN public.sales_patient_enrollment_intents i ON i.organization_id=period.organization_id AND i.id=period.renewal_intent_id
    WHERE period.organization_id=p_organization_id AND i.purpose='RENEWAL' AND i.status='FULFILLED'
      AND i.renewed_at IS NOT NULL AND NOT m.is_demo AND NOT payment.is_demo
      AND payment.paid_at BETWEEN p_from AND p_to
      AND (v_role IN ('SUPERADMIN','ADMINISTRATOR','AUDITOR') OR m.seller_member_id=p_actor_member_id
        OR (v_role='SALES_MANAGER' AND EXISTS(SELECT 1 FROM public.sales_team_members tm
          WHERE tm.organization_id=p_organization_id AND tm.member_id=p_actor_member_id AND tm.team_id=m.team_id)))
  ), scoped_activities AS MATERIALIZED (
    SELECT a.id,a.kind FROM public.sales_activities a
    WHERE a.organization_id=p_organization_id
      AND a.created_at >= (p_from::timestamp AT TIME ZONE 'UTC')
      AND a.created_at < ((p_to+1)::timestamp AT TIME ZONE 'UTC')
      -- Match the activity inbox policy, independently of the parent's creation date.
      AND (v_role IN ('SUPERADMIN','ADMINISTRATOR','AUDITOR')
        OR (a.kind='TASK' AND num_nonnulls(a.lead_id,a.contact_id,a.account_id,a.opportunity_id)=0
          AND (a.actor_member_id=p_actor_member_id OR a.assignee_member_id=p_actor_member_id))
        OR (a.lead_id IS NOT NULL AND public.native_sales_activity_parent_visible(
          p_organization_id,p_actor_member_id,'leads',a.lead_id))
        OR (a.contact_id IS NOT NULL AND public.native_sales_activity_parent_visible(
          p_organization_id,p_actor_member_id,'contacts',a.contact_id))
        OR (a.account_id IS NOT NULL AND public.native_sales_activity_parent_visible(
          p_organization_id,p_actor_member_id,'accounts',a.account_id))
        OR (a.opportunity_id IS NOT NULL AND public.native_sales_activity_parent_visible(
          p_organization_id,p_actor_member_id,'opportunities',a.opportunity_id)))
  ), lead_stage_counts AS (
    SELECT status AS code,count(*)::integer AS count FROM scoped_leads GROUP BY status
  ), lead_source_counts AS (
    SELECT source AS code,count(*)::integer AS count FROM scoped_leads GROUP BY source
  ), lead_seller_counts AS (
    SELECT owner_member_id AS member_id,count(*)::integer AS count,
      count(*) FILTER (WHERE converted_at IS NOT NULL)::integer AS converted
      FROM scoped_leads GROUP BY owner_member_id
  ), opportunity_stage_counts AS (
    SELECT code,stage_name AS label,outcome,count(*)::integer AS count
      FROM scoped_opportunities GROUP BY code,stage_name,outcome
  ), membership_plan_counts AS (
    SELECT plan AS code,count(*)::integer AS count FROM scoped_memberships GROUP BY plan
  ), membership_modality_counts AS (
    SELECT duration AS code,count(*)::integer AS count FROM scoped_memberships GROUP BY duration
  ), membership_seller_counts AS (
    SELECT seller_member_id AS member_id,currency,count(*)::integer AS count,
      sum(amount)::text AS amount FROM scoped_memberships
      GROUP BY seller_member_id,currency
  ), activity_kind_counts AS (
    SELECT kind AS code,count(*)::integer AS count FROM scoped_activities GROUP BY kind
  )
  SELECT jsonb_build_object(
    'generatedAt',now(),'range',jsonb_build_object('from',p_from,'to',p_to),
    'scope',CASE WHEN v_role IN ('SUPERADMIN','ADMINISTRATOR','AUDITOR') THEN 'organization' ELSE 'permitted' END,
    'leads',jsonb_build_object(
      'total',(SELECT count(*) FROM scoped_leads),
      'converted',(SELECT count(*) FROM scoped_leads WHERE converted_at IS NOT NULL),
      'conversionRate',(SELECT CASE WHEN count(*)=0 THEN 0 ELSE
        round(100.0*count(*) FILTER (WHERE converted_at IS NOT NULL)/count(*),2) END FROM scoped_leads),
      'unresponsive',(SELECT count(*) FROM scoped_leads WHERE status='UNRESPONSIVE'),
      'byStage',coalesce((SELECT jsonb_agg(jsonb_build_object('code',code,'count',count) ORDER BY count DESC,code)
        FROM lead_stage_counts),'[]'::jsonb),
      'bySource',coalesce((SELECT jsonb_agg(jsonb_build_object('code',code,'count',count) ORDER BY count DESC,code)
        FROM lead_source_counts),'[]'::jsonb),
      'bySeller',coalesce((SELECT jsonb_agg(jsonb_build_object('memberId',s.member_id,
        'label',coalesce(nullif(btrim(u.nombre_display),''),u.email,m.display_name,'Staff unavailable'),
        'count',s.count,'converted',s.converted,
        'conversionRate',CASE WHEN s.count=0 THEN 0 ELSE round(100.0*s.converted/s.count,2) END)
        ORDER BY s.count DESC,coalesce(u.nombre_display,m.display_name),s.member_id)
        FROM lead_seller_counts s JOIN public.sales_members m ON m.id=s.member_id
        LEFT JOIN public.usuarios u ON u.id=m.user_id),'[]'::jsonb)),
    'opportunities',jsonb_build_object(
      'total',(SELECT count(*) FROM scoped_opportunities),
      'won',(SELECT count(*) FROM scoped_opportunities WHERE outcome='WON'),
      'lost',(SELECT count(*) FROM scoped_opportunities WHERE outcome='LOST'),
      'byStage',coalesce((SELECT jsonb_agg(jsonb_build_object('code',code,'label',label,
        'outcome',outcome,'count',count) ORDER BY code) FROM opportunity_stage_counts),'[]'::jsonb)),
    'memberships',jsonb_build_object(
      'sold',(SELECT count(*) FROM scoped_memberships),
      'byPlan',coalesce((SELECT jsonb_agg(jsonb_build_object('code',code,'count',count) ORDER BY count DESC,code)
        FROM membership_plan_counts),'[]'::jsonb),
      'byModality',coalesce((SELECT jsonb_agg(jsonb_build_object('code',code,'count',count) ORDER BY count DESC,code)
        FROM membership_modality_counts),'[]'::jsonb),
      'salesBySeller',coalesce((SELECT jsonb_agg(jsonb_build_object('memberId',s.member_id,
        'label',coalesce(nullif(btrim(u.nombre_display),''),u.email,m.display_name,'Staff unavailable'),
        'currency',s.currency,'count',s.count,'amount',s.amount)
        ORDER BY s.count DESC,coalesce(u.nombre_display,m.display_name),s.member_id,s.currency)
        FROM membership_seller_counts s JOIN public.sales_members m ON m.id=s.member_id
        LEFT JOIN public.usuarios u ON u.id=m.user_id),'[]'::jsonb)),
    'renewals',jsonb_build_object('completed',(SELECT count(*) FROM scoped_renewals),
      'paidCents',coalesce((SELECT sum(amount_cents) FROM scoped_renewals),0),'currency','USD'),
    'activities',jsonb_build_object(
      'total',(SELECT count(*) FROM scoped_activities),
      'followUps',(SELECT count(*) FROM scoped_activities WHERE kind='FOLLOW_UP'),
      'byKind',coalesce((SELECT jsonb_agg(jsonb_build_object('code',code,'count',count) ORDER BY count DESC,code)
        FROM activity_kind_counts),'[]'::jsonb))
  ) INTO v_result;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_report_detail(uuid,uuid,date,date)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_report_detail(uuid,uuid,date,date)
  TO service_role;

-- Renewal is a distinct billing purpose. membership_id remains the RESULT of
-- reconciliation; renewal_membership_id is the immutable target, never proof of payment.
ALTER TABLE public.sales_patient_enrollment_intents
  ADD COLUMN purpose text NOT NULL DEFAULT 'ENROLLMENT' CHECK(purpose IN ('ENROLLMENT','RENEWAL')),
  ADD COLUMN renewal_membership_id uuid,
  ADD COLUMN renewal_base_expires_at date,
  ADD COLUMN renewal_starts_at date,
  ADD COLUMN renewal_expires_at date,
  ADD COLUMN renewed_at timestamptz,
  ADD COLUMN required_agreement_version text NOT NULL DEFAULT 'v5',
  ADD COLUMN renewal_agreement_acceptance_id uuid REFERENCES public.sales_patient_agreement_acceptances(id),
  ADD FOREIGN KEY(organization_id,renewal_membership_id) REFERENCES public.sales_memberships(organization_id,id),
  ADD CHECK ((purpose='ENROLLMENT' AND renewal_membership_id IS NULL AND renewal_base_expires_at IS NULL)
    OR (purpose='RENEWAL' AND renewal_membership_id IS NOT NULL AND renewal_base_expires_at IS NOT NULL));
ALTER TABLE public.sales_patient_enrollment_intents
  DROP CONSTRAINT sales_patient_enrollment_intents_initial_months_check;
ALTER TABLE public.sales_patient_enrollment_intents ADD CHECK (
  (purpose='ENROLLMENT' AND initial_months IN (2,3,6,12)) OR
  (purpose='RENEWAL' AND initial_months IN (1,3,6,12)));
CREATE UNIQUE INDEX sales_patient_one_pending_renewal
  ON public.sales_patient_enrollment_intents(organization_id,renewal_membership_id)
  WHERE purpose='RENEWAL' AND status NOT IN ('FULFILLED','CANCELLED');
CREATE UNIQUE INDEX sales_patient_renewal_period_once
  ON public.sales_patient_enrollment_intents(organization_id,renewal_membership_id,renewal_base_expires_at)
  WHERE purpose='RENEWAL' AND status='FULFILLED';
ALTER TABLE public.sales_qbo_invoice_jobs
  ADD COLUMN purpose text NOT NULL DEFAULT 'ENROLLMENT' CHECK(purpose IN ('ENROLLMENT','RENEWAL'));
ALTER TABLE public.sales_membership_periods
  ADD COLUMN renewal_intent_id uuid,
  ADD COLUMN sales_payment_id uuid,
  ADD FOREIGN KEY(organization_id,renewal_intent_id) REFERENCES public.sales_patient_enrollment_intents(organization_id,id),
  ADD FOREIGN KEY(organization_id,sales_payment_id) REFERENCES public.sales_payments(organization_id,id),
  ADD UNIQUE(organization_id,renewal_intent_id),
  ADD UNIQUE(organization_id,sales_payment_id);

CREATE FUNCTION public.native_sales_renewal_quote(p_plan text,p_type text,p_duration text)
RETURNS TABLE(months integer,total_cents integer,monthly_cents integer,visit_fee_cents integer,included_visits integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT CASE WHEN p_duration='MONTHLY' THEN 1 ELSE q.initial_months::integer END,
    CASE WHEN p_duration='MONTHLY' THEN q.monthly_cents ELSE q.total_cents END,
    q.monthly_cents,q.visit_fee_cents,q.included_visits
  FROM public.native_sales_membership_quote(p_plan,p_type,p_duration) q
  WHERE auth.role()='service_role';
$$;

-- Version changes fail closed until their acceptance/storage policy is deployed.
-- Existing v5 consent may cover an unchanged plan/type/term renewal; retain its
-- exact evidence ID rather than inventing a second acceptance.
CREATE FUNCTION public.native_sales_patient_invoice_agreement_valid(p_intent_id uuid)
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
      OR (i.purpose='RENEWAL' AND a.id=i.renewal_agreement_acceptance_id AND EXISTS (
        SELECT 1 FROM public.sales_patient_enrollment_intents prior
        WHERE prior.organization_id=i.organization_id AND prior.id=a.enrollment_intent_id
          AND prior.status='FULFILLED' AND prior.membership_id=i.renewal_membership_id))));
$$;

CREATE FUNCTION public.native_sales_patient_renewal_opportunity(p_intent_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE i public.sales_patient_enrollment_intents%ROWTYPE;
DECLARE m public.sales_memberships%ROWTYPE;
DECLARE original public.sales_opportunities%ROWTYPE;
DECLARE stage public.sales_stages%ROWTYPE;
DECLARE op uuid;
DECLARE quote record;
BEGIN
  SELECT * INTO i FROM public.sales_patient_enrollment_intents WHERE id=p_intent_id;
  SELECT * INTO m FROM public.sales_memberships WHERE organization_id=i.organization_id AND id=i.renewal_membership_id;
  IF i.purpose IS DISTINCT FROM 'RENEWAL' OR m.id IS NULL OR m.is_demo
    OR m.primary_contact_id IS DISTINCT FROM (SELECT contact_id FROM public.sales_patient_identities WHERE id=i.patient_identity_id)
    OR (m.plan,m.membership_type,m.duration,m.expires_at) IS DISTINCT FROM
       (i.plan,i.membership_type,i.duration,i.renewal_base_expires_at) THEN
    RAISE EXCEPTION 'RENEWAL_MEMBERSHIP_MISMATCH' USING ERRCODE='22023'; END IF;
  SELECT * INTO quote FROM public.native_sales_renewal_quote(i.plan,i.membership_type,i.duration);
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

CREATE FUNCTION public.native_sales_patient_request_online_renewal(p_identity_id uuid,p_membership_id uuid,p_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE identity public.sales_patient_identities%ROWTYPE;
DECLARE m public.sales_memberships%ROWTYPE;
DECLARE existing public.sales_patient_enrollment_intents%ROWTYPE;
DECLARE quote record; evidence uuid;
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
    OR m.duration NOT IN ('MONTHLY','3M','6M','12M') OR m.plan NOT IN ('ESSENTIAL','PLUS','MAX') THEN
    RAISE EXCEPTION 'RENEWAL_NOT_ELIGIBLE' USING ERRCODE='22023'; END IF;
  SELECT * INTO existing FROM public.sales_patient_enrollment_intents WHERE organization_id=m.organization_id
    AND renewal_membership_id=m.id AND purpose='RENEWAL' AND status NOT IN ('CANCELLED','FULFILLED');
  IF FOUND THEN RETURN to_jsonb(existing)||jsonb_build_object('replayed',true); END IF;
  IF EXISTS(SELECT 1 FROM public.sales_patient_enrollment_intents WHERE patient_identity_id=identity.id
    AND status IN ('PAYMENT_UNAVAILABLE','PAYMENT_PENDING','CHANGE_REQUESTED','CANCELLATION_REQUESTED')) THEN
    RAISE EXCEPTION 'PATIENT_SELECTION_ALREADY_EXISTS' USING ERRCODE='23505'; END IF;
  SELECT * INTO quote FROM public.native_sales_renewal_quote(m.plan,m.membership_type,m.duration);
  SELECT a.id INTO evidence FROM public.sales_patient_agreement_acceptances a
    JOIN public.sales_patient_enrollment_intents prior ON prior.organization_id=a.organization_id AND prior.id=a.enrollment_intent_id
    WHERE a.organization_id=m.organization_id AND a.patient_identity_id=identity.id AND a.auth_id=identity.auth_id
      AND a.contact_id=m.primary_contact_id AND prior.membership_id=m.id AND prior.status='FULFILLED'
      AND a.agreement_version='v5' AND a.plan=m.plan AND a.membership_type=m.membership_type AND a.duration=m.duration
    ORDER BY a.accepted_at DESC,a.id DESC LIMIT 1;
  INSERT INTO public.sales_patient_enrollment_intents(organization_id,patient_identity_id,plan,membership_type,duration,
    initial_months,amount_cents,status,idempotency_key,purpose,renewal_membership_id,renewal_base_expires_at,renewal_agreement_acceptance_id)
  VALUES(m.organization_id,identity.id,m.plan,m.membership_type,m.duration,quote.months,quote.total_cents,
    'PAYMENT_UNAVAILABLE',p_key,'RENEWAL',m.id,m.expires_at,evidence) RETURNING * INTO existing;
  SELECT * INTO existing FROM public.sales_patient_enrollment_intents WHERE id=existing.id;
  IF existing.opportunity_id IS NULL THEN RAISE EXCEPTION 'RENEWAL_OPPORTUNITY_NOT_CREATED'; END IF;
  RETURN to_jsonb(existing)||jsonb_build_object('replayed',false);
END;
$$;

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

CREATE OR REPLACE FUNCTION public.native_sales_qbo_claim_invoice(p_identity_id uuid,p_intent_id uuid)
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
     opportunity_id,plan,membership_type,duration,amount_cents,purpose)
  VALUES (v_intent.organization_id,v_intent.id,v_identity.id,v_identity.contact_id,
    v_intent.opportunity_id,v_intent.plan,v_intent.membership_type,
    v_intent.duration,v_intent.amount_cents,v_intent.purpose)
  ON CONFLICT (organization_id,enrollment_intent_id) DO NOTHING;
  RETURN QUERY SELECT * FROM public.sales_qbo_invoice_jobs
    WHERE organization_id=v_intent.organization_id AND enrollment_intent_id=v_intent.id;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_qbo_claim_invoice(uuid,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_qbo_claim_invoice(uuid,uuid) TO service_role;


-- Activate v5 invoice enforcement only after both runtimes persist acceptance.
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
        AND i.duration=NEW.duration AND i.amount_cents=NEW.amount_cents AND i.purpose=NEW.purpose) THEN
    RAISE EXCEPTION 'PATIENT_AGREEMENT_REQUIRED' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;

-- Atomic, proof-gated extension. Never creates another member, changes its
-- identity/code/owner/household, or extends coverage on a pending payment.
CREATE FUNCTION public.native_sales_patient_complete_renewal(p_intent_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE i public.sales_patient_enrollment_intents%ROWTYPE;
DECLARE m public.sales_memberships%ROWTYPE;
DECLARE q public.sales_patient_qbo_manual%ROWTYPE;
DECLARE payment public.sales_payments%ROWTYPE;
DECLARE quote record; starts date; ends date; won uuid;
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
  IF quote.total_cents IS DISTINCT FROM i.amount_cents OR quote.months IS DISTINCT FROM i.initial_months::integer THEN
    RAISE EXCEPTION 'RENEWAL_QUOTE_MISMATCH' USING ERRCODE='22023'; END IF;
  starts:=greatest(m.expires_at,payment.paid_at);
  ends:=public.native_sales_add_membership_months(starts,quote.months);
  SELECT s.id INTO won FROM public.sales_stages s JOIN public.sales_pipelines p ON p.organization_id=s.organization_id AND p.id=s.pipeline_id
    WHERE p.organization_id=i.organization_id AND p.code='PATIENT_ENROLLMENT' AND p.active AND s.code='WON';
  IF won IS NULL THEN RAISE EXCEPTION 'RENEWAL_WORKSPACE_UNAVAILABLE'; END IF;
  INSERT INTO public.sales_membership_periods(organization_id,membership_id,starts_at,expires_at,plan,duration,amount_cents,renewal_intent_id,sales_payment_id)
    VALUES(i.organization_id,m.id,starts,ends,i.plan,i.duration,i.amount_cents,i.id,payment.id);
  UPDATE public.sales_patient_enrollment_intents SET membership_id=m.id,status='FULFILLED',
    renewal_starts_at=starts,renewal_expires_at=ends,renewed_at=now() WHERE id=i.id;
  UPDATE public.sales_memberships SET expires_at=ends,status='ACTIVE' WHERE id=m.id AND organization_id=i.organization_id;
  UPDATE public.sales_patient_qbo_manual SET membership_activation_status='ACTIVE',updated_at=now() WHERE id=q.id;
  UPDATE public.sales_opportunities SET stage_id=won,probability=100,actual_close_date=payment.paid_at,
    updated_at=now(),version=version+1 WHERE organization_id=i.organization_id AND id=i.opportunity_id;
  INSERT INTO public.sales_history(organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
    VALUES(i.organization_id,'membership',m.id,q.qbo_payment_verified_by,'renewal.activated',i.id,
      jsonb_build_object('intentId',i.id,'paymentId',payment.id,'previousExpiresAt',m.expires_at,'startsAt',starts,'expiresAt',ends,'code',m.code));
  RETURN jsonb_build_object('membershipId',m.id,'code',m.code,'startsAt',starts,'expiresAt',ends,'replayed',false);
END;
$$;

CREATE FUNCTION public.native_sales_patient_cancel_renewal(p_identity_id uuid,p_intent_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE i public.sales_patient_enrollment_intents%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'PATIENT_SERVER_ONLY' USING ERRCODE='42501'; END IF;
  SELECT * INTO i FROM public.sales_patient_enrollment_intents WHERE id=p_intent_id
    AND patient_identity_id=p_identity_id AND purpose='RENEWAL'
    AND organization_id='9efab353-46a0-43d1-9901-e3f185dc5d30' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'RENEWAL_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  IF i.status IN ('CANCELLED','CANCELLATION_REQUESTED') THEN RETURN to_jsonb(i); END IF;
  IF i.status='FULFILLED' OR EXISTS(SELECT 1 FROM public.sales_patient_qbo_manual
    WHERE organization_id=i.organization_id AND enrollment_intent_id=i.id
      AND (sales_payment_id IS NOT NULL OR qbo_payment_status IN ('PAID','VERIFIED','REPORTED'))) THEN
    RAISE EXCEPTION 'RENEWAL_PAYMENT_LOCKED' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM public.sales_qbo_invoice_jobs WHERE organization_id=i.organization_id AND enrollment_intent_id=i.id) THEN
    IF NOT EXISTS(SELECT 1 FROM public.sales_qbo_invoice_jobs j JOIN public.sales_patient_qbo_manual q
      ON q.organization_id=j.organization_id AND q.enrollment_intent_id=j.enrollment_intent_id
      WHERE j.organization_id=i.organization_id AND j.enrollment_intent_id=i.id AND j.state='LINKED'
        AND q.qbo_invoice_status='OPEN' AND q.qbo_payment_status='UNPAID' AND q.sales_payment_id IS NULL) THEN
      RAISE EXCEPTION 'RENEWAL_INVOICE_REVIEW_REQUIRED' USING ERRCODE='42501'; END IF;
    UPDATE public.sales_patient_enrollment_intents SET status='CANCELLATION_REQUESTED' WHERE id=i.id RETURNING * INTO i;
    INSERT INTO public.sales_history(organization_id,entity_type,record_id,action,request_id,changes)
      VALUES(i.organization_id,'membership',i.renewal_membership_id,'renewal.cancellation_requested',i.id,jsonb_build_object('intentId',i.id));
    RETURN to_jsonb(i);
  END IF;
  UPDATE public.sales_patient_enrollment_intents SET status='CANCELLED' WHERE id=i.id RETURNING * INTO i;
  INSERT INTO public.sales_history(organization_id,entity_type,record_id,action,request_id,changes)
    VALUES(i.organization_id,'membership',i.renewal_membership_id,'renewal.cancelled',i.id,jsonb_build_object('intentId',i.id));
  RETURN to_jsonb(i);
END;
$$;

CREATE OR REPLACE FUNCTION public.native_sales_patient_follow_up_intent()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_identity public.sales_patient_identities%ROWTYPE;
DECLARE v_lead public.sales_leads%ROWTYPE;
DECLARE v_hours integer;
DECLARE v_action text;
BEGIN
  IF NEW.purpose='RENEWAL' THEN
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

CREATE OR REPLACE FUNCTION public.native_sales_patient_qbo_after_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_intent public.sales_patient_enrollment_intents%ROWTYPE;
DECLARE v_stage uuid;
DECLARE v_lead uuid;
BEGIN
  IF TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM public.sales_patient_enrollment_intents i
    WHERE i.organization_id=NEW.organization_id AND i.purpose='RENEWAL' AND i.renewal_membership_id=NEW.id
      AND i.membership_id=NEW.id AND i.status='FULFILLED' AND i.renewed_at IS NOT NULL
      AND i.renewal_expires_at=NEW.expires_at) THEN RETURN NEW; END IF;
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
  IF EXISTS(SELECT 1 FROM public.sales_payments p JOIN public.sales_patient_enrollment_intents i
    ON i.organization_id=p.organization_id AND i.opportunity_id=p.opportunity_id
    WHERE p.organization_id=p_organization_id AND p.id=p_payment_id AND i.purpose='RENEWAL') THEN
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

REVOKE ALL ON FUNCTION public.native_sales_renewal_quote(text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_renewal_quote(text,text,text) TO service_role;

REVOKE ALL ON FUNCTION public.native_sales_patient_invoice_agreement_valid(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_invoice_agreement_valid(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.native_sales_patient_renewal_opportunity(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_renewal_opportunity(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.native_sales_patient_request_online_renewal(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_request_online_renewal(uuid,uuid,uuid) TO service_role;

REVOKE ALL ON FUNCTION public.native_sales_patient_complete_renewal(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_complete_renewal(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.native_sales_patient_cancel_renewal(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_cancel_renewal(uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.native_sales_qbo_invoice_selection_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF OLD.purpose='RENEWAL' AND (OLD.plan,OLD.membership_type,OLD.duration,OLD.amount_cents,OLD.opportunity_id,
      OLD.purpose,OLD.renewal_membership_id,OLD.renewal_base_expires_at,OLD.required_agreement_version,OLD.renewal_agreement_acceptance_id)
      IS NOT DISTINCT FROM (NEW.plan,NEW.membership_type,NEW.duration,NEW.amount_cents,NEW.opportunity_id,
      NEW.purpose,NEW.renewal_membership_id,NEW.renewal_base_expires_at,NEW.required_agreement_version,NEW.renewal_agreement_acceptance_id)
    AND EXISTS(SELECT 1 FROM public.sales_patient_qbo_manual q WHERE q.organization_id=OLD.organization_id
      AND q.enrollment_intent_id=OLD.id AND q.sales_payment_id IS NULL AND (
        (NEW.status='CANCELLATION_REQUESTED' AND OLD.status='PAYMENT_PENDING'
          AND q.qbo_invoice_status='OPEN' AND q.qbo_payment_status='UNPAID')
        OR (NEW.status='CANCELLED' AND OLD.status='CANCELLATION_REQUESTED'
          AND q.qbo_invoice_status='VOID' AND q.qbo_payment_status='REJECTED'))) THEN RETURN NEW; END IF;
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

CREATE OR REPLACE FUNCTION public.native_sales_patient_confirm_invoice_void(
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
  IF v_intent.purpose='RENEWAL' THEN
    UPDATE public.sales_patient_enrollment_intents SET status='CANCELLED' WHERE id=v_intent.id;
    INSERT INTO public.sales_history(organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
      VALUES(v_intent.organization_id,'membership',v_intent.renewal_membership_id,p_actor_member_id,
        'renewal.cancelled_after_void',p_request_id,jsonb_build_object('intentId',v_intent.id));
  END IF;
  RETURN jsonb_build_object('intentId',v_intent.id,'invoiceStatus','VOID');
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_patient_confirm_invoice_void(uuid,uuid,text,text,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_confirm_invoice_void(uuid,uuid,text,text,uuid)
  TO service_role;

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
  IF v_intent.purpose='RENEWAL' THEN RAISE EXCEPTION 'RENEWAL_USE_DEDICATED_ACTION' USING ERRCODE='42501'; END IF;
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

-- Preserve the exact approved EMC fallback identity through its active lifecycle.
CREATE OR REPLACE FUNCTION public.native_sales_patient_qbo_owner(p_member_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT auth.role()='service_role' AND EXISTS (
    SELECT 1 FROM public.sales_members m JOIN public.usuarios u
      ON u.id=m.user_id AND u.auth_id=m.auth_id
    WHERE m.id=p_member_id AND m.organization_id='9efab353-46a0-43d1-9901-e3f185dc5d30'
      AND u.activo AND (
        (m.role='FINANCE' AND m.status='active') OR
        (m.id='c67e9779-9e87-48b0-9f6c-bf6a0c8cebad'
          AND m.user_id='2344e112-76ef-42a8-ac56-7c488084e0f5'
          AND m.role='SUPERADMIN' AND m.status IN ('pending','active')
          AND m.evidence_ref='owner-approved-emc-patient-fallback-2026-10-20'))
  );
$$;
REVOKE ALL ON FUNCTION public.native_sales_patient_qbo_owner(uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_qbo_owner(uuid) TO service_role;


-- Preserve the exact approved EMC fallback identity through its active lifecycle.
CREATE OR REPLACE FUNCTION public.native_sales_patient_qbo_membership_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,pg_temp AS $$
DECLARE v_intent public.sales_patient_enrollment_intents%ROWTYPE;
DECLARE v_qbo public.sales_patient_qbo_manual%ROWTYPE;
DECLARE v_verifier public.sales_members%ROWTYPE;
BEGIN
  IF NEW.status <> 'ACTIVE' THEN RETURN NEW; END IF;
  SELECT * INTO v_intent FROM public.sales_patient_enrollment_intents
    WHERE organization_id=NEW.organization_id AND opportunity_id=NEW.opportunity_id;
  IF NOT FOUND THEN
    IF EXISTS (SELECT 1 FROM public.sales_patient_identities i
      WHERE i.organization_id=NEW.organization_id AND i.contact_id=NEW.primary_contact_id) THEN
      RAISE EXCEPTION 'PATIENT_QBO_INTENT_REQUIRED' USING ERRCODE='42501';
    END IF;
    RETURN NEW;
  END IF;
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
      AND v_verifier.role='SUPERADMIN' AND v_verifier.status IN ('pending','active')
      AND v_verifier.evidence_ref='owner-approved-emc-patient-fallback-2026-10-20')
  ) THEN RAISE EXCEPTION 'PATIENT_QBO_VERIFIER_FORBIDDEN' USING ERRCODE='42501'; END IF;
  IF NEW.created_by <> v_verifier.id
    OR NOT public.native_sales_patient_qbo_owner(v_verifier.id) THEN
    RAISE EXCEPTION 'PATIENT_QBO_ACTIVATION_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.native_sales_online_renewal_status(p_organization_id uuid,p_actor_member_id uuid,p_membership_id uuid,p_limit integer,p_offset integer)
RETURNS SETOF jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' OR NOT public.native_sales_renewal_access(p_organization_id,p_actor_member_id,p_membership_id) THEN
    RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  IF p_limit NOT BETWEEN 1 AND 100 OR p_offset NOT BETWEEN 0 AND 100000 THEN
    RAISE EXCEPTION 'INVALID_FILTER' USING ERRCODE='22023'; END IF;
  RETURN QUERY SELECT jsonb_build_object('id',i.id,'status',i.status,'amountCents',i.amount_cents,
    'invoiceState',coalesce(q.qbo_invoice_status,'NOT_CREATED'),'invoiceNumber',q.qbo_invoice_number,
    'invoiceJobState',j.state,'paymentState',coalesce(q.qbo_payment_status,'UNPAID'),
    'reconciliationState',coalesce(q.verification_state,'PENDING_INVOICE'),'createdAt',i.created_at,
    'renewedAt',i.renewed_at,'startsAt',i.renewal_starts_at,'expiresAt',i.renewal_expires_at)
    FROM public.sales_patient_enrollment_intents i
    LEFT JOIN public.sales_patient_qbo_manual q ON q.organization_id=i.organization_id AND q.enrollment_intent_id=i.id
    LEFT JOIN public.sales_qbo_invoice_jobs j ON j.organization_id=i.organization_id AND j.enrollment_intent_id=i.id
    WHERE i.organization_id=p_organization_id AND i.renewal_membership_id=p_membership_id AND i.purpose='RENEWAL'
    ORDER BY i.created_at DESC,i.id DESC LIMIT p_limit OFFSET p_offset;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_online_renewal_status(uuid,uuid,uuid,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_online_renewal_status(uuid,uuid,uuid,integer,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.native_sales_patient_family_draft_action(
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
  IF NOT FOUND OR v_intent.purpose<>'ENROLLMENT' OR v_intent.membership_type<>'FAMILY' OR v_intent.opportunity_id IS NULL THEN
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

CREATE OR REPLACE FUNCTION public.native_sales_patient_family_drafts_after_activation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_membership public.sales_memberships%ROWTYPE;
BEGIN
  IF NEW.purpose='RENEWAL' THEN RETURN NEW; END IF;
  IF NEW.status<>'FULFILLED' OR NEW.membership_type<>'FAMILY'
    OR NEW.membership_id IS NULL OR OLD.status='FULFILLED' THEN RETURN NEW; END IF;
  SELECT * INTO v_membership FROM public.sales_memberships
    WHERE organization_id=NEW.organization_id AND id=NEW.membership_id
      AND status='ACTIVE' AND is_demo=false AND sales_payment_id IS NOT NULL
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
