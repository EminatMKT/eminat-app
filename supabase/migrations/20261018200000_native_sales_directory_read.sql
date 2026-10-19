-- Human labels for Sales users, teams, and stages. IDs remain API keys only.
CREATE FUNCTION public.native_sales_directory(
  p_organization_id uuid,p_actor_member_id uuid
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role text;
DECLARE v_result jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  SELECT m.role INTO v_role FROM public.sales_members m
    JOIN public.sales_organizations o ON o.id=m.organization_id
    WHERE m.organization_id=p_organization_id AND m.id=p_actor_member_id
      AND m.status='active' AND o.status='active';
  IF v_role IS NULL OR v_role='FINANCE' THEN
    RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE='42501';
  END IF;
  SELECT jsonb_build_object(
    'users',coalesce((SELECT jsonb_agg(jsonb_build_object(
      'memberId',m.id,'displayName',coalesce(nullif(btrim(u.nombre_display),''),u.email),
      'role',m.role,'teamIds',coalesce((SELECT jsonb_agg(tm.team_id ORDER BY tm.team_id)
        FROM public.sales_team_members tm WHERE tm.organization_id=p_organization_id
          AND tm.member_id=m.id),'[]'::jsonb)) ORDER BY u.nombre_display,m.id)
      FROM public.sales_members m
      JOIN public.usuarios u ON u.id=m.user_id
      WHERE m.organization_id=p_organization_id AND m.status='active'
        AND (v_role IN ('SUPERADMIN','ADMINISTRATOR','AUDITOR')
          OR m.id=p_actor_member_id
          OR EXISTS (SELECT 1 FROM public.sales_team_members own
            JOIN public.sales_team_members peer ON peer.organization_id=own.organization_id
              AND peer.team_id=own.team_id AND peer.member_id=m.id
            WHERE own.organization_id=p_organization_id AND own.member_id=p_actor_member_id))
    ),'[]'::jsonb),
    'teams',coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'name',t.name)
      ORDER BY t.name,t.id) FROM public.sales_teams t
      WHERE t.organization_id=p_organization_id AND t.active
        AND (v_role IN ('SUPERADMIN','ADMINISTRATOR','AUDITOR')
          OR EXISTS (SELECT 1 FROM public.sales_team_members tm
            WHERE tm.organization_id=p_organization_id AND tm.member_id=p_actor_member_id
              AND tm.team_id=t.id))),'[]'::jsonb),
    'stages',coalesce((SELECT jsonb_agg(jsonb_build_object(
      'id',s.id,'code',s.code,'name',s.name,'position',s.position,
      'outcome',s.outcome,'pipelineId',s.pipeline_id)
      ORDER BY p.created_at,s.position,s.id)
      FROM public.sales_stages s JOIN public.sales_pipelines p
        ON p.organization_id=s.organization_id AND p.id=s.pipeline_id
      WHERE s.organization_id=p_organization_id AND p.active),'[]'::jsonb)
  ) INTO v_result;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_directory(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_directory(uuid,uuid) TO service_role;
