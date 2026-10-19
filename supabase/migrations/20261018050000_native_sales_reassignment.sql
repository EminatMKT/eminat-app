-- Atomic Lead reassignment with ANNIE-equivalent Seller denial.
CREATE FUNCTION public.native_sales_reassign_lead(
  p_organization_id uuid, p_actor_member_id uuid, p_lead_id uuid,
  p_expected_version integer, p_owner_member_id uuid, p_team_id uuid,
  p_request_id uuid
) RETURNS public.sales_leads
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_actor public.sales_members%ROWTYPE;
DECLARE v_target public.sales_members%ROWTYPE;
DECLARE v_before public.sales_leads%ROWTYPE;
DECLARE v_after public.sales_leads%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE = '42501';
  END IF;
  IF p_expected_version < 1 OR p_request_id IS NULL OR p_owner_member_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE = '22023';
  END IF;
  SELECT m.* INTO v_actor FROM public.sales_members m
    JOIN public.sales_organizations o ON o.id = m.organization_id
    WHERE m.id = p_actor_member_id AND m.organization_id = p_organization_id
      AND m.status = 'active' AND o.status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE = '42501'; END IF;
  IF v_actor.role NOT IN ('SALES_MANAGER','ADMINISTRATOR','SUPERADMIN') THEN
    RAISE EXCEPTION 'REASSIGN_FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_before FROM public.sales_leads
    WHERE id = p_lead_id AND organization_id = p_organization_id AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'LEAD_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  IF v_before.version <> p_expected_version THEN
    RAISE EXCEPTION 'VERSION_CONFLICT' USING ERRCODE = '40001';
  END IF;
  IF v_actor.role = 'SALES_MANAGER' AND v_before.owner_member_id <> p_actor_member_id AND NOT EXISTS (
    SELECT 1 FROM public.sales_team_members tm
    WHERE tm.organization_id = p_organization_id AND tm.member_id = p_actor_member_id
      AND tm.team_id = v_before.team_id
  ) THEN RAISE EXCEPTION 'TEAM_FORBIDDEN' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_target FROM public.sales_members
    WHERE id = p_owner_member_id AND organization_id = p_organization_id AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'OWNER_NOT_ELIGIBLE' USING ERRCODE = '22023'; END IF;
  IF p_team_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.sales_team_members tm
    JOIN public.sales_teams t ON t.organization_id = tm.organization_id AND t.id = tm.team_id
    WHERE tm.organization_id = p_organization_id AND tm.member_id = p_owner_member_id
      AND tm.team_id = p_team_id AND t.active
  ) THEN RAISE EXCEPTION 'OWNER_TEAM_MISMATCH' USING ERRCODE = '22023'; END IF;
  IF v_actor.role = 'SALES_MANAGER' AND (p_team_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.sales_team_members tm
    WHERE tm.organization_id = p_organization_id AND tm.member_id = p_actor_member_id
      AND tm.team_id = p_team_id
  )) THEN RAISE EXCEPTION 'TEAM_FORBIDDEN' USING ERRCODE = '42501'; END IF;
  IF v_before.owner_member_id = p_owner_member_id AND v_before.team_id IS NOT DISTINCT FROM p_team_id THEN
    RETURN v_before;
  END IF;
  UPDATE public.sales_leads SET owner_member_id = p_owner_member_id, team_id = p_team_id,
    version = version + 1, updated_by = p_actor_member_id, updated_at = now()
    WHERE id = p_lead_id AND organization_id = p_organization_id RETURNING * INTO v_after;
  INSERT INTO public.sales_history (organization_id, entity_type, record_id, actor_member_id,
    action, request_id, changes)
    VALUES (p_organization_id, 'lead', p_lead_id, p_actor_member_id,
      'owner.assigned', p_request_id,
      jsonb_build_object(
        'ownerMemberId', jsonb_build_object('from', v_before.owner_member_id, 'to', p_owner_member_id),
        'teamId', jsonb_build_object('from', v_before.team_id, 'to', p_team_id)));
  RETURN v_after;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_reassign_lead(uuid,uuid,uuid,integer,uuid,uuid,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_reassign_lead(uuid,uuid,uuid,integer,uuid,uuid,uuid)
  TO service_role;
