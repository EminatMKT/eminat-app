-- Native Lead rules run in the LILLY database and never call ANNIE.
CREATE TABLE public.sales_lead_transition_rules (
  from_status text NOT NULL,
  to_status text NOT NULL,
  PRIMARY KEY (from_status, to_status)
);
INSERT INTO public.sales_lead_transition_rules (from_status, to_status) VALUES
('NEW','ASSIGNED'),('NEW','ATTEMPTING_CONTACT'),('NEW','CONTACTED'),('NEW','FOLLOW_UP'),('NEW','UNRESPONSIVE'),('NEW','NOT_INTERESTED'),('NEW','LOST'),
('ASSIGNED','ATTEMPTING_CONTACT'),('ASSIGNED','CONTACTED'),('ASSIGNED','FOLLOW_UP'),('ASSIGNED','UNRESPONSIVE'),('ASSIGNED','NOT_INTERESTED'),('ASSIGNED','LOST'),
('ATTEMPTING_CONTACT','CONTACTED'),('ATTEMPTING_CONTACT','FOLLOW_UP'),('ATTEMPTING_CONTACT','UNRESPONSIVE'),('ATTEMPTING_CONTACT','NOT_INTERESTED'),('ATTEMPTING_CONTACT','LOST'),
('CONTACTED','QUALIFIED'),('CONTACTED','FOLLOW_UP'),('CONTACTED','UNRESPONSIVE'),('CONTACTED','NOT_INTERESTED'),('CONTACTED','LOST'),
('FOLLOW_UP','ATTEMPTING_CONTACT'),('FOLLOW_UP','CONTACTED'),('FOLLOW_UP','QUALIFIED'),('FOLLOW_UP','UNRESPONSIVE'),('FOLLOW_UP','NOT_INTERESTED'),('FOLLOW_UP','LOST'),
('QUALIFIED','PROPOSAL'),('QUALIFIED','FOLLOW_UP'),('QUALIFIED','NOT_INTERESTED'),('QUALIFIED','LOST'),
('PROPOSAL','PAYMENT_PENDING'),('PROPOSAL','LOST'),
('PAYMENT_PENDING','WON'),('PAYMENT_PENDING','LOST'),
('LOST','NEW'),
('UNRESPONSIVE','ATTEMPTING_CONTACT'),('UNRESPONSIVE','CONTACTED'),('UNRESPONSIVE','FOLLOW_UP'),('UNRESPONSIVE','NOT_INTERESTED'),('UNRESPONSIVE','LOST'),
('NOT_INTERESTED','NEW');
ALTER TABLE public.sales_lead_transition_rules ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sales_lead_transition_rules FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.sales_lead_transition_rules TO service_role;

CREATE FUNCTION public.native_sales_visible_leads(
  p_organization_id uuid, p_actor_member_id uuid, p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0, p_q text DEFAULT NULL, p_status text DEFAULT NULL
) RETURNS SETOF public.sales_leads
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE = '42501';
  END IF;
  IF p_limit NOT BETWEEN 1 AND 100 OR p_offset NOT BETWEEN 0 AND 100000
     OR length(coalesce(p_q,'')) > 200 THEN
    RAISE EXCEPTION 'INVALID_FILTER' USING ERRCODE = '22023';
  END IF;
  SELECT m.role INTO v_role FROM public.sales_members m
  JOIN public.sales_organizations o ON o.id = m.organization_id
  WHERE m.id = p_actor_member_id AND m.organization_id = p_organization_id
    AND m.status = 'active' AND o.status = 'active';
  IF v_role IS NULL OR v_role = 'FINANCE' THEN
    RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT l.* FROM public.sales_leads l
    WHERE l.organization_id = p_organization_id AND l.archived_at IS NULL
      AND (p_status IS NULL OR l.status = p_status)
      AND (p_q IS NULL OR position(lower(p_q) in lower(l.display_name)) > 0
        OR position(lower(p_q) in lower(coalesce(l.email,''))) > 0)
      AND (
        v_role IN ('SUPERADMIN','ADMINISTRATOR','AUDITOR')
        OR l.owner_member_id = p_actor_member_id
        OR (v_role = 'SALES_MANAGER' AND l.team_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.sales_team_members tm
          WHERE tm.organization_id = p_organization_id AND tm.member_id = p_actor_member_id AND tm.team_id = l.team_id
        ))
        OR EXISTS (
          SELECT 1 FROM public.sales_record_grants g
          WHERE g.organization_id = p_organization_id AND g.member_id = p_actor_member_id
            AND g.entity_type = 'lead' AND g.record_id = l.id AND g.revoked_at IS NULL
        )
      )
    ORDER BY l.created_at DESC, l.id DESC LIMIT p_limit OFFSET p_offset;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_visible_leads(uuid,uuid,integer,integer,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_visible_leads(uuid,uuid,integer,integer,text,text) TO service_role;

CREATE FUNCTION public.native_sales_transition_lead(
  p_organization_id uuid, p_actor_member_id uuid, p_lead_id uuid,
  p_expected_version integer, p_to_status text, p_request_id uuid
) RETURNS public.sales_leads
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_actor public.sales_members%ROWTYPE;
DECLARE v_lead public.sales_leads%ROWTYPE;
DECLARE v_updated public.sales_leads%ROWTYPE;
DECLARE v_allowed boolean;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE = '42501';
  END IF;
  IF p_expected_version < 1 OR p_request_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE = '22023';
  END IF;
  SELECT m.* INTO v_actor FROM public.sales_members m
  JOIN public.sales_organizations o ON o.id = m.organization_id
  WHERE m.id = p_actor_member_id AND m.organization_id = p_organization_id
    AND m.status = 'active' AND o.status = 'active';
  IF NOT FOUND OR v_actor.role NOT IN ('SELLER','SALES_MANAGER','ADMINISTRATOR','SUPERADMIN') THEN
    RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_lead FROM public.sales_leads
    WHERE id = p_lead_id AND organization_id = p_organization_id AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'LEAD_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  v_allowed := v_actor.role IN ('SUPERADMIN','ADMINISTRATOR')
    OR v_lead.owner_member_id = p_actor_member_id
    OR (v_actor.role = 'SALES_MANAGER' AND v_lead.team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.sales_team_members tm
      WHERE tm.organization_id = p_organization_id AND tm.member_id = p_actor_member_id AND tm.team_id = v_lead.team_id
    ))
    OR EXISTS (
      SELECT 1 FROM public.sales_record_grants g
      WHERE g.organization_id = p_organization_id AND g.member_id = p_actor_member_id
        AND g.entity_type = 'lead' AND g.record_id = p_lead_id AND g.can_write AND g.revoked_at IS NULL
    );
  IF NOT v_allowed THEN RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE = '42501'; END IF;
  IF v_lead.version <> p_expected_version THEN
    RAISE EXCEPTION 'VERSION_CONFLICT' USING ERRCODE = '40001';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sales_lead_transition_rules t
    WHERE t.from_status = v_lead.status AND t.to_status = p_to_status) THEN
    RAISE EXCEPTION 'INVALID_LEAD_TRANSITION' USING ERRCODE = '22023';
  END IF;
  IF p_to_status = 'WON' AND (v_lead.converted_opportunity_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.sales_payments p
    WHERE p.organization_id = p_organization_id
      AND p.opportunity_id = v_lead.converted_opportunity_id
  )) THEN
    RAISE EXCEPTION 'LEAD_WON_REQUIRES_PAID_OPPORTUNITY' USING ERRCODE = '22023';
  END IF;
  UPDATE public.sales_leads SET status = p_to_status, version = version + 1,
    updated_by = p_actor_member_id, updated_at = now()
    WHERE id = p_lead_id AND organization_id = p_organization_id RETURNING * INTO v_updated;
  INSERT INTO public.sales_history (organization_id, entity_type, record_id, actor_member_id,
    action, request_id, changes)
    VALUES (p_organization_id, 'lead', p_lead_id, p_actor_member_id,
      'transition', p_request_id,
      jsonb_build_object('status', jsonb_build_object('from', v_lead.status, 'to', p_to_status)));
  RETURN v_updated;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_transition_lead(uuid,uuid,uuid,integer,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_transition_lead(uuid,uuid,uuid,integer,text,uuid) TO service_role;
