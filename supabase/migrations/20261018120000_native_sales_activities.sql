-- One native timeline for notes, tasks, calls, meetings, email, and follow-ups.
-- The linked CRM record remains the authorization boundary.
CREATE FUNCTION public.native_sales_activity_parent_visible(
  p_organization_id uuid, p_actor_member_id uuid, p_resource text, p_record_id uuid
) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE = '42501';
  END IF;
  IF p_resource NOT IN ('leads','contacts','accounts','opportunities') OR p_record_id IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (SELECT 1 FROM public.native_sales_visible_crm(
    p_organization_id,p_actor_member_id,p_resource,1,0,NULL,p_record_id));
END;
$$;

CREATE FUNCTION public.native_sales_create_activity(
  p_organization_id uuid, p_actor_member_id uuid, p_resource text, p_record_id uuid,
  p_kind text, p_title text, p_body text, p_due_at timestamptz,
  p_assignee_member_id uuid, p_idempotency_key text, p_payload_hash text, p_request_id uuid
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_actor public.sales_members%ROWTYPE;
DECLARE v_parent jsonb;
DECLARE v_operation public.sales_write_operations%ROWTYPE;
DECLARE v_activity public.sales_activities%ROWTYPE;
DECLARE v_assignee uuid;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE = '42501';
  END IF;
  IF p_request_id IS NULL OR p_resource IS NULL
    OR p_resource NOT IN ('leads','contacts','accounts','opportunities','general')
    OR (p_resource = 'general' AND (p_record_id IS NOT NULL OR p_kind IS DISTINCT FROM 'TASK'))
    OR (p_resource <> 'general' AND p_record_id IS NULL)
    OR p_kind NOT IN ('NOTE','TASK','CALL_ATTEMPT','MEETING','FOLLOW_UP')
    OR p_title IS NULL OR length(btrim(p_title)) NOT BETWEEN 1 AND 240
    OR length(coalesce(p_body,'')) > 20000
    OR p_idempotency_key IS NULL OR p_idempotency_key !~ '^[A-Za-z0-9_-]{8,128}$'
    OR p_payload_hash IS NULL OR p_payload_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE = '22023';
  END IF;
  SELECT m.* INTO v_actor FROM public.sales_members m
    JOIN public.sales_organizations o ON o.id = m.organization_id
    WHERE m.id = p_actor_member_id AND m.organization_id = p_organization_id
      AND m.status = 'active' AND o.status = 'active';
  IF NOT FOUND OR v_actor.role NOT IN ('SELLER','SALES_MANAGER','ADMINISTRATOR','SUPERADMIN') THEN
    RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;
  IF p_resource <> 'general' THEN
    SELECT row INTO v_parent FROM public.native_sales_visible_crm(
      p_organization_id,p_actor_member_id,p_resource,1,0,NULL,p_record_id) AS row;
    IF v_parent IS NULL THEN RAISE EXCEPTION 'PARENT_NOT_AVAILABLE' USING ERRCODE = '42501'; END IF;
  END IF;
  v_assignee := coalesce(p_assignee_member_id,p_actor_member_id);
  IF v_assignee <> p_actor_member_id AND v_actor.role = 'SELLER' THEN
    RAISE EXCEPTION 'REASSIGN_FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sales_members
    WHERE organization_id = p_organization_id AND id = v_assignee AND status = 'active') THEN
    RAISE EXCEPTION 'OWNER_NOT_ELIGIBLE' USING ERRCODE = '22023';
  END IF;
  IF v_actor.role = 'SALES_MANAGER' AND v_assignee <> p_actor_member_id AND NOT EXISTS (
    SELECT 1 FROM public.sales_team_members own
    JOIN public.sales_team_members target ON target.organization_id = own.organization_id
      AND target.team_id = own.team_id
    WHERE own.organization_id = p_organization_id AND own.member_id = p_actor_member_id
      AND target.member_id = v_assignee
  ) THEN RAISE EXCEPTION 'OWNER_OUT_OF_SCOPE' USING ERRCODE = '42501'; END IF;
  INSERT INTO public.sales_write_operations
    (organization_id,actor_member_id,operation,idempotency_key,payload_hash)
    VALUES (p_organization_id,p_actor_member_id,'activity.create',p_idempotency_key,p_payload_hash)
    ON CONFLICT (organization_id,actor_member_id,operation,idempotency_key) DO NOTHING;
  SELECT * INTO v_operation FROM public.sales_write_operations
    WHERE organization_id=p_organization_id AND actor_member_id=p_actor_member_id
      AND operation='activity.create' AND idempotency_key=p_idempotency_key FOR UPDATE;
  IF v_operation.payload_hash <> p_payload_hash THEN
    RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE = '23505';
  END IF;
  IF v_operation.record_id IS NOT NULL THEN
    SELECT * INTO v_activity FROM public.sales_activities
      WHERE organization_id=p_organization_id AND id=v_operation.record_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'OPERATION_INCOMPLETE' USING ERRCODE = 'P0001'; END IF;
    RETURN to_jsonb(v_activity);
  END IF;
  INSERT INTO public.sales_activities (
    organization_id,kind,title,body,actor_member_id,assignee_member_id,due_at,
    lead_id,contact_id,account_id,opportunity_id
  ) VALUES (
    p_organization_id,p_kind,btrim(p_title),nullif(btrim(p_body),''),p_actor_member_id,v_assignee,p_due_at,
    CASE WHEN p_resource='leads' THEN p_record_id END,
    CASE WHEN p_resource='contacts' THEN p_record_id END,
    CASE WHEN p_resource='accounts' THEN p_record_id END,
    CASE WHEN p_resource='opportunities' THEN p_record_id END
  ) RETURNING * INTO v_activity;
  UPDATE public.sales_write_operations SET record_id=v_activity.id WHERE id=v_operation.id;
  INSERT INTO public.sales_history
    (organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
    VALUES (p_organization_id,'activity',v_activity.id,p_actor_member_id,'created',p_request_id,
      jsonb_build_object('resource',p_resource,'parentId',p_record_id,'kind',p_kind));
  RETURN to_jsonb(v_activity);
END;
$$;

CREATE FUNCTION public.native_sales_list_activities(
  p_organization_id uuid, p_actor_member_id uuid, p_resource text, p_record_id uuid,
  p_limit integer DEFAULT 25, p_offset integer DEFAULT 0
) RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE = '42501';
  END IF;
  IF p_limit NOT BETWEEN 1 AND 100 OR p_offset NOT BETWEEN 0 AND 100000 THEN
    RAISE EXCEPTION 'INVALID_FILTER' USING ERRCODE = '22023';
  END IF;
  IF NOT public.native_sales_activity_parent_visible(p_organization_id,p_actor_member_id,p_resource,p_record_id) THEN
    RAISE EXCEPTION 'PARENT_NOT_AVAILABLE' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT to_jsonb(a) FROM public.sales_activities a
    WHERE a.organization_id=p_organization_id AND
      CASE p_resource
        WHEN 'leads' THEN a.lead_id=p_record_id
        WHEN 'contacts' THEN a.contact_id=p_record_id
        WHEN 'accounts' THEN a.account_id=p_record_id
        WHEN 'opportunities' THEN a.opportunity_id=p_record_id
      END
    ORDER BY a.created_at DESC,a.id DESC LIMIT p_limit OFFSET p_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.native_sales_activity_parent_visible(uuid,uuid,text,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.native_sales_create_activity(uuid,uuid,text,uuid,text,text,text,timestamptz,uuid,text,text,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.native_sales_list_activities(uuid,uuid,text,uuid,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_activity_parent_visible(uuid,uuid,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.native_sales_create_activity(uuid,uuid,text,uuid,text,text,text,timestamptz,uuid,text,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.native_sales_list_activities(uuid,uuid,text,uuid,integer,integer) TO service_role;
