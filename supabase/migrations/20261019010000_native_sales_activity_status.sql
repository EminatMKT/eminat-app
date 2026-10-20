-- Staff can close or cancel a scoped task/follow-up; EMAIL delivery state is
-- managed only by its dedicated provider workflow.
CREATE FUNCTION public.native_sales_set_activity_status(
  p_organization_id uuid,p_actor_member_id uuid,p_activity_id uuid,
  p_expected_version integer,p_status text,p_request_id uuid
) RETURNS public.sales_activities
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role text;
DECLARE v_before public.sales_activities%ROWTYPE;
DECLARE v_after public.sales_activities%ROWTYPE;
DECLARE v_resource text;
DECLARE v_parent_id uuid;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  IF p_expected_version<1 OR p_request_id IS NULL OR p_status NOT IN ('COMPLETED','CANCELLED') THEN
    RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE='22023';
  END IF;
  SELECT m.role INTO v_role FROM public.sales_members m
    JOIN public.sales_organizations o ON o.id=m.organization_id
    WHERE m.organization_id=p_organization_id AND m.id=p_actor_member_id
      AND m.status='active' AND o.status='active';
  IF v_role NOT IN ('SELLER','SALES_MANAGER','ADMINISTRATOR','SUPERADMIN') OR v_role IS NULL THEN
    RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_before FROM public.sales_activities
    WHERE organization_id=p_organization_id AND id=p_activity_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ACTIVITY_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  IF v_before.kind='EMAIL' THEN
    RAISE EXCEPTION 'EMAIL_STATUS_PROVIDER_ONLY' USING ERRCODE='42501';
  END IF;
  v_resource:=CASE WHEN v_before.lead_id IS NOT NULL THEN 'leads'
    WHEN v_before.contact_id IS NOT NULL THEN 'contacts'
    WHEN v_before.account_id IS NOT NULL THEN 'accounts' ELSE 'opportunities' END;
  v_parent_id:=coalesce(v_before.lead_id,v_before.contact_id,v_before.account_id,v_before.opportunity_id);
  IF NOT public.native_sales_activity_parent_visible(
    p_organization_id,p_actor_member_id,v_resource,v_parent_id)
    OR (v_role='SELLER' AND v_before.actor_member_id<>p_actor_member_id
      AND v_before.assignee_member_id IS DISTINCT FROM p_actor_member_id) THEN
    RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE='42501';
  END IF;
  IF v_before.version<>p_expected_version THEN
    RAISE EXCEPTION 'VERSION_CONFLICT' USING ERRCODE='40001';
  END IF;
  IF v_before.status<>'PENDING' THEN
    RAISE EXCEPTION 'ACTIVITY_STATE_CONFLICT' USING ERRCODE='23514';
  END IF;
  UPDATE public.sales_activities SET status=p_status,
    completed_at=CASE WHEN p_status='COMPLETED' THEN now() ELSE completed_at END,
    updated_at=now(),version=version+1
    WHERE organization_id=p_organization_id AND id=p_activity_id RETURNING * INTO v_after;
  INSERT INTO public.sales_history (organization_id,entity_type,record_id,actor_member_id,
    action,request_id,changes)
    VALUES (p_organization_id,'activity',p_activity_id,p_actor_member_id,'status.changed',
      p_request_id,jsonb_build_object('status',jsonb_build_object('from',v_before.status,'to',p_status)));
  RETURN v_after;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_set_activity_status(uuid,uuid,uuid,integer,text,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_set_activity_status(uuid,uuid,uuid,integer,text,uuid)
  TO service_role;
