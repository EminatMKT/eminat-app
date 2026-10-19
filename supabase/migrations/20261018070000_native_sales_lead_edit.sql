-- Native Lead edits are versioned, owner scoped, and atomic with history.
-- Stage and reassignment mutations use their dedicated guarded functions.
CREATE FUNCTION public.native_sales_update_lead(
  p_organization_id uuid, p_actor_member_id uuid, p_lead_id uuid,
  p_expected_version integer, p_patch jsonb, p_request_id uuid
) RETURNS public.sales_leads
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_actor public.sales_members%ROWTYPE;
DECLARE v_before public.sales_leads%ROWTYPE;
DECLARE v_after public.sales_leads%ROWTYPE;
DECLARE v_allowed boolean;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE = '42501';
  END IF;
  IF p_expected_version < 1 OR p_request_id IS NULL OR jsonb_typeof(p_patch) <> 'object'
    OR p_patch = '{}'::jsonb OR EXISTS (
      SELECT 1 FROM jsonb_object_keys(p_patch) AS key
      WHERE key NOT IN ('displayName','firstName','lastName','companyName','title',
        'email','phone','website','industry','description','source','sourceDetail',
        'doNotCall','doNotEmail','nextAction','nextFollowUpAt')
    ) THEN RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE = '22023'; END IF;
  IF (p_patch ? 'displayName' AND length(btrim(coalesce(p_patch->>'displayName',''))) NOT BETWEEN 1 AND 500)
    OR (p_patch ? 'source' AND length(btrim(coalesce(p_patch->>'source',''))) NOT BETWEEN 1 AND 500)
    OR length(coalesce(p_patch->>'email','')) > 320
    OR length(coalesce(p_patch->>'phone','')) > 80 THEN
    RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE = '22023';
  END IF;
  SELECT m.* INTO v_actor FROM public.sales_members m
    JOIN public.sales_organizations o ON o.id = m.organization_id
    WHERE m.id = p_actor_member_id AND m.organization_id = p_organization_id
      AND m.status = 'active' AND o.status = 'active';
  IF NOT FOUND OR v_actor.role NOT IN ('SELLER','SALES_MANAGER','ADMINISTRATOR','SUPERADMIN') THEN
    RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_before FROM public.sales_leads
    WHERE id = p_lead_id AND organization_id = p_organization_id AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'LEAD_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  v_allowed := v_actor.role IN ('SUPERADMIN','ADMINISTRATOR')
    OR v_before.owner_member_id = p_actor_member_id
    OR (v_actor.role = 'SALES_MANAGER' AND v_before.team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.sales_team_members tm
      WHERE tm.organization_id = p_organization_id AND tm.member_id = p_actor_member_id
        AND tm.team_id = v_before.team_id
    ))
    OR EXISTS (
      SELECT 1 FROM public.sales_record_grants g
      WHERE g.organization_id = p_organization_id AND g.member_id = p_actor_member_id
        AND g.entity_type = 'lead' AND g.record_id = p_lead_id
        AND g.can_write AND g.revoked_at IS NULL
    );
  IF NOT v_allowed THEN RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE = '42501'; END IF;
  IF v_before.version <> p_expected_version THEN
    RAISE EXCEPTION 'VERSION_CONFLICT' USING ERRCODE = '40001';
  END IF;
  UPDATE public.sales_leads SET
    display_name = CASE WHEN p_patch ? 'displayName' THEN btrim(p_patch->>'displayName') ELSE display_name END,
    first_name = CASE WHEN p_patch ? 'firstName' THEN p_patch->>'firstName' ELSE first_name END,
    last_name = CASE WHEN p_patch ? 'lastName' THEN p_patch->>'lastName' ELSE last_name END,
    company_name = CASE WHEN p_patch ? 'companyName' THEN p_patch->>'companyName' ELSE company_name END,
    title = CASE WHEN p_patch ? 'title' THEN p_patch->>'title' ELSE title END,
    email = CASE WHEN p_patch ? 'email' THEN p_patch->>'email' ELSE email END,
    phone = CASE WHEN p_patch ? 'phone' THEN p_patch->>'phone' ELSE phone END,
    website = CASE WHEN p_patch ? 'website' THEN p_patch->>'website' ELSE website END,
    industry = CASE WHEN p_patch ? 'industry' THEN p_patch->>'industry' ELSE industry END,
    description = CASE WHEN p_patch ? 'description' THEN p_patch->>'description' ELSE description END,
    source = CASE WHEN p_patch ? 'source' THEN btrim(p_patch->>'source') ELSE source END,
    source_detail = CASE WHEN p_patch ? 'sourceDetail' THEN p_patch->>'sourceDetail' ELSE source_detail END,
    do_not_call = CASE WHEN p_patch ? 'doNotCall' THEN (p_patch->>'doNotCall')::boolean ELSE do_not_call END,
    do_not_email = CASE WHEN p_patch ? 'doNotEmail' THEN (p_patch->>'doNotEmail')::boolean ELSE do_not_email END,
    next_action = CASE WHEN p_patch ? 'nextAction' THEN p_patch->>'nextAction' ELSE next_action END,
    next_follow_up_at = CASE WHEN p_patch ? 'nextFollowUpAt' THEN (p_patch->>'nextFollowUpAt')::timestamptz ELSE next_follow_up_at END,
    version = version + 1, updated_by = p_actor_member_id, updated_at = now()
    WHERE id = p_lead_id AND organization_id = p_organization_id RETURNING * INTO v_after;
  INSERT INTO public.sales_history (organization_id, entity_type, record_id, actor_member_id,
    action, request_id, changes)
    VALUES (p_organization_id, 'lead', p_lead_id, p_actor_member_id,
      'updated', p_request_id,
      jsonb_build_object('fields', (SELECT jsonb_agg(key ORDER BY key) FROM jsonb_object_keys(p_patch) AS key)));
  RETURN v_after;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_update_lead(uuid,uuid,uuid,integer,jsonb,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_update_lead(uuid,uuid,uuid,integer,jsonb,uuid)
  TO service_role;
