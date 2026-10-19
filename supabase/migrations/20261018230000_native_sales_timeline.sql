-- One scoped timeline for CRM history and its linked activities.
CREATE FUNCTION public.native_sales_timeline(
  p_organization_id uuid,p_actor_member_id uuid,p_resource text,p_record_id uuid,
  p_limit integer DEFAULT 50,p_offset integer DEFAULT 0
) RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  IF p_resource NOT IN ('leads','contacts','accounts','opportunities')
    OR p_record_id IS NULL OR p_limit NOT BETWEEN 1 AND 100
    OR p_offset NOT BETWEEN 0 AND 100000 THEN
    RAISE EXCEPTION 'INVALID_FILTER' USING ERRCODE='22023';
  END IF;
  IF NOT public.native_sales_activity_parent_visible(
    p_organization_id,p_actor_member_id,p_resource,p_record_id) THEN
    RAISE EXCEPTION 'PARENT_NOT_AVAILABLE' USING ERRCODE='42501';
  END IF;
  RETURN QUERY
  SELECT event FROM (
    SELECT h.occurred_at AS happened_at,h.id AS event_id,
      jsonb_build_object('id',h.id,'type','history','action',h.action,
        'actorName',coalesce(nullif(btrim(u.nombre_display),''),u.email,'System'),
        'occurredAt',h.occurred_at,'changes',h.changes) AS event
    FROM public.sales_history h
    LEFT JOIN public.sales_members m ON m.organization_id=h.organization_id AND m.id=h.actor_member_id
    LEFT JOIN public.usuarios u ON u.id=m.user_id
    WHERE h.organization_id=p_organization_id AND h.entity_type=CASE p_resource
      WHEN 'leads' THEN 'lead' WHEN 'contacts' THEN 'contact'
      WHEN 'accounts' THEN 'account' ELSE 'opportunity' END
      AND h.record_id=p_record_id
    UNION ALL
    SELECT a.created_at,a.id,
      jsonb_build_object('id',a.id,'type','activity','kind',a.kind,'title',a.title,
        'body',a.body,'status',a.status,'dueAt',a.due_at,
        'actorName',coalesce(nullif(btrim(au.nombre_display),''),au.email),
        'occurredAt',a.created_at)
    FROM public.sales_activities a
    JOIN public.sales_members am ON am.organization_id=a.organization_id AND am.id=a.actor_member_id
    JOIN public.usuarios au ON au.id=am.user_id
    WHERE a.organization_id=p_organization_id
      AND CASE p_resource WHEN 'leads' THEN a.lead_id=p_record_id
        WHEN 'contacts' THEN a.contact_id=p_record_id
        WHEN 'accounts' THEN a.account_id=p_record_id
        ELSE a.opportunity_id=p_record_id END
  ) timeline ORDER BY happened_at DESC,event_id DESC LIMIT p_limit OFFSET p_offset;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_timeline(uuid,uuid,text,uuid,integer,integer)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_timeline(uuid,uuid,text,uuid,integer,integer)
  TO service_role;
