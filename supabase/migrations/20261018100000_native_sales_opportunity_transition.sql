-- Atomic Pipeline transitions. This mirrors ANNIE's verified stage graph and
-- Corazón Salud Won prerequisites without calling ANNIE at runtime.
CREATE TABLE public.sales_opportunity_transition_rules (
  from_code text NOT NULL,
  to_code text NOT NULL,
  PRIMARY KEY (from_code, to_code)
);
INSERT INTO public.sales_opportunity_transition_rules (from_code,to_code) VALUES
 ('NEW','QUALIFIED'),('NEW','LOST'),('CONTACTED','QUALIFIED'),('CONTACTED','LOST'),
 ('QUALIFIED','PROPOSAL'),('QUALIFIED','LOST'),
 ('PROPOSAL','PAYMENT_PENDING'),('PROPOSAL','LOST'),
 ('PAYMENT_PENDING','WON'),('PAYMENT_PENDING','LOST'),
 ('WON','QUALIFIED'),('LOST','QUALIFIED');
ALTER TABLE public.sales_opportunity_transition_rules ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sales_opportunity_transition_rules FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.sales_opportunity_transition_rules TO service_role;

CREATE FUNCTION public.native_sales_transition_opportunity(
  p_organization_id uuid, p_actor_member_id uuid, p_opportunity_id uuid,
  p_expected_version integer, p_payload jsonb, p_request_id uuid
) RETURNS public.sales_opportunities
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_actor public.sales_members%ROWTYPE;
DECLARE v_before public.sales_opportunities%ROWTYPE;
DECLARE v_after public.sales_opportunities%ROWTYPE;
DECLARE v_previous public.sales_stages%ROWTYPE;
DECLARE v_target public.sales_stages%ROWTYPE;
DECLARE v_amount numeric(18,2);
DECLARE v_actual_close_date date;
DECLARE v_lost_reason text;
DECLARE v_reason text;
DECLARE v_allowed boolean;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE = '42501';
  END IF;
  IF p_expected_version < 1 OR p_request_id IS NULL OR jsonb_typeof(p_payload) <> 'object'
    OR length(coalesce(p_payload->>'stageCode','')) = 0 OR EXISTS (
      SELECT 1 FROM jsonb_object_keys(p_payload) AS key
      WHERE key NOT IN ('stageCode','amount','currency','actualCloseDate','lostReason','reason')
    ) THEN RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE = '22023'; END IF;
  IF p_payload ? 'currency' AND (p_payload->>'currency') !~ '^[A-Z]{3}$' THEN
    RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE = '22023';
  END IF;
  SELECT m.* INTO v_actor FROM public.sales_members m
    JOIN public.sales_organizations o ON o.id=m.organization_id
    WHERE m.id=p_actor_member_id AND m.organization_id=p_organization_id
      AND m.status='active' AND o.status='active';
  IF NOT FOUND OR v_actor.role NOT IN ('SELLER','SALES_MANAGER','ADMINISTRATOR','SUPERADMIN') THEN
    RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_before FROM public.sales_opportunities
    WHERE id=p_opportunity_id AND organization_id=p_organization_id AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'OPPORTUNITY_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  v_allowed := v_actor.role IN ('SUPERADMIN','ADMINISTRATOR')
    OR v_before.owner_member_id=p_actor_member_id
    OR (v_actor.role='SALES_MANAGER' AND v_before.team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.sales_team_members tm WHERE tm.organization_id=p_organization_id
        AND tm.member_id=p_actor_member_id AND tm.team_id=v_before.team_id
    ))
    OR EXISTS (SELECT 1 FROM public.sales_record_grants g
      WHERE g.organization_id=p_organization_id AND g.member_id=p_actor_member_id
        AND g.entity_type='opportunity' AND g.record_id=p_opportunity_id
        AND g.can_write AND g.revoked_at IS NULL);
  IF NOT v_allowed THEN RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  IF v_before.version <> p_expected_version THEN
    RAISE EXCEPTION 'VERSION_CONFLICT' USING ERRCODE='40001';
  END IF;
  SELECT * INTO v_previous FROM public.sales_stages
    WHERE organization_id=p_organization_id AND id=v_before.stage_id;
  SELECT * INTO v_target FROM public.sales_stages
    WHERE organization_id=p_organization_id AND pipeline_id=v_previous.pipeline_id
      AND code=p_payload->>'stageCode';
  IF v_previous.id IS NULL OR v_target.id IS NULL THEN
    RAISE EXCEPTION 'INVALID_STAGE' USING ERRCODE='22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sales_opportunity_transition_rules
    WHERE from_code=v_previous.code AND to_code=v_target.code) THEN
    RAISE EXCEPTION 'INVALID_STAGE_TRANSITION' USING ERRCODE='22023';
  END IF;
  v_reason := p_payload->>'reason';
  IF v_previous.outcome <> 'OPEN' AND
    (v_target.outcome <> 'OPEN' OR v_actor.role NOT IN ('SALES_MANAGER','ADMINISTRATOR','SUPERADMIN')
      OR length(btrim(coalesce(v_reason,''))) = 0) THEN
    RAISE EXCEPTION 'REOPEN_REQUIRES_PERMISSION_AND_REASON' USING ERRCODE='42501';
  END IF;
  v_amount := CASE WHEN p_payload ? 'amount' THEN (p_payload->>'amount')::numeric(18,2) ELSE v_before.amount END;
  IF v_amount < 0 THEN RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE='22023'; END IF;
  IF v_target.code IN ('PROPOSAL','WON') AND v_amount IS NULL THEN
    RAISE EXCEPTION 'AMOUNT_REQUIRED' USING ERRCODE='22023';
  END IF;
  v_actual_close_date := CASE WHEN p_payload ? 'actualCloseDate'
    THEN (p_payload->>'actualCloseDate')::date ELSE NULL END;
  IF v_target.code='WON' AND v_actual_close_date IS NULL THEN
    RAISE EXCEPTION 'ACTUAL_CLOSE_DATE_REQUIRED' USING ERRCODE='22023';
  END IF;
  IF v_target.code='WON' AND coalesce(v_before.product,'') ~* 'coraz[oó]n salud'
    AND NOT EXISTS (SELECT 1 FROM public.sales_payments p
      WHERE p.organization_id=p_organization_id AND p.opportunity_id=p_opportunity_id) THEN
    RAISE EXCEPTION 'CONFIRMED_PAYMENT_REQUIRED' USING ERRCODE='22023';
  END IF;
  IF v_target.code='WON' AND (
    EXISTS (SELECT 1 FROM public.sales_payments p
      WHERE p.organization_id=p_organization_id AND p.opportunity_id=p_opportunity_id)
    OR coalesce(v_before.product,'') ~* 'coraz[oó]n salud'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.sales_payments p
    JOIN public.sales_memberships m ON m.organization_id=p.organization_id
      AND m.sales_payment_id=p.id AND m.opportunity_id=p_opportunity_id AND m.status='ACTIVE'
    WHERE p.organization_id=p_organization_id AND p.opportunity_id=p_opportunity_id
  ) THEN RAISE EXCEPTION 'ACTIVE_MEMBERSHIP_REQUIRED' USING ERRCODE='22023'; END IF;
  v_lost_reason := p_payload->>'lostReason';
  IF v_target.code='LOST' AND length(btrim(coalesce(v_lost_reason,'')))=0 THEN
    RAISE EXCEPTION 'LOST_REASON_REQUIRED' USING ERRCODE='22023';
  END IF;
  UPDATE public.sales_opportunities SET
    stage_id=v_target.id, probability=v_target.probability, amount=v_amount,
    currency=coalesce(p_payload->>'currency',v_before.currency),
    actual_close_date=CASE WHEN v_target.outcome='OPEN' THEN NULL ELSE v_actual_close_date END,
    lost_reason=CASE WHEN v_target.code='LOST' THEN v_lost_reason ELSE NULL END,
    version=version+1, updated_by=p_actor_member_id, updated_at=now()
    WHERE id=p_opportunity_id AND organization_id=p_organization_id RETURNING * INTO v_after;
  INSERT INTO public.sales_history (organization_id,entity_type,record_id,actor_member_id,
    action,request_id,changes)
    VALUES (p_organization_id,'opportunity',p_opportunity_id,p_actor_member_id,
      'stage.changed',p_request_id,
      jsonb_build_object('stage',jsonb_build_object('from',v_previous.code,'to',v_target.code),
        'reason',v_reason));
  RETURN v_after;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_transition_opportunity(uuid,uuid,uuid,integer,jsonb,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_transition_opportunity(uuid,uuid,uuid,integer,jsonb,uuid)
  TO service_role;
