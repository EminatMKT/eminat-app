-- Aggregate from the same stage rows the pipeline reads. Won/Lost totals
-- cannot drift from the stage breakdown or use a separate status cache.
CREATE FUNCTION public.native_sales_report_summary(
  p_organization_id uuid, p_actor_member_id uuid
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
  WITH scoped_leads AS MATERIALIZED (
    SELECT l.status FROM public.sales_leads l
    WHERE l.organization_id=p_organization_id AND l.archived_at IS NULL
      AND (v_role IN ('SUPERADMIN','ADMINISTRATOR','AUDITOR')
        OR l.owner_member_id=p_actor_member_id
        OR (v_role='SALES_MANAGER' AND l.team_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.sales_team_members tm
          WHERE tm.organization_id=p_organization_id AND tm.member_id=p_actor_member_id
            AND tm.team_id=l.team_id))
        OR EXISTS (SELECT 1 FROM public.sales_record_grants g
          WHERE g.organization_id=p_organization_id AND g.entity_type='lead'
            AND g.record_id=l.id AND g.member_id=p_actor_member_id AND g.revoked_at IS NULL))
  ), scoped_opportunities AS MATERIALIZED (
    SELECT s.code,s.name AS label,s.outcome,o.amount,o.currency FROM public.sales_opportunities o
    JOIN public.sales_stages s ON s.organization_id=o.organization_id AND s.id=o.stage_id
    WHERE o.organization_id=p_organization_id AND o.archived_at IS NULL
      AND (v_role IN ('SUPERADMIN','ADMINISTRATOR','AUDITOR')
        OR o.owner_member_id=p_actor_member_id
        OR (v_role='SALES_MANAGER' AND o.team_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.sales_team_members tm
          WHERE tm.organization_id=p_organization_id AND tm.member_id=p_actor_member_id
            AND tm.team_id=o.team_id))
        OR EXISTS (SELECT 1 FROM public.sales_record_grants g
          WHERE g.organization_id=p_organization_id AND g.entity_type='opportunity'
            AND g.record_id=o.id AND g.member_id=p_actor_member_id AND g.revoked_at IS NULL))
  ), lead_counts AS (
    SELECT status,count(*)::integer AS count FROM scoped_leads GROUP BY status
  ), stage_counts AS (
    SELECT code,label,outcome,count(*)::integer AS count FROM scoped_opportunities GROUP BY code,label,outcome
  )
  SELECT jsonb_build_object(
    'asOf',now(),
    'scope',CASE WHEN v_role IN ('SUPERADMIN','ADMINISTRATOR','AUDITOR') THEN 'organization' ELSE 'permitted' END,
    'leads',jsonb_build_object(
      'total',(SELECT count(*) FROM scoped_leads),
      'byStatus',coalesce((SELECT jsonb_agg(jsonb_build_object('code',status,'count',count) ORDER BY status)
        FROM lead_counts),'[]'::jsonb)),
    'opportunities',jsonb_build_object(
      'total',(SELECT count(*) FROM scoped_opportunities),
      'byStage',coalesce((SELECT jsonb_agg(jsonb_build_object('code',code,'label',label,'outcome',outcome,'count',count) ORDER BY code)
        FROM stage_counts),'[]'::jsonb),
      'won',(SELECT count(*) FROM scoped_opportunities WHERE outcome='WON'),
      'lost',(SELECT count(*) FROM scoped_opportunities WHERE outcome='LOST'),
      'open',(SELECT count(*) FROM scoped_opportunities WHERE outcome='OPEN'),
      'openByCurrency',coalesce((SELECT jsonb_agg(jsonb_build_object('currency',currency,'amount',total) ORDER BY currency)
        FROM (SELECT currency,sum(coalesce(amount,0))::text AS total FROM scoped_opportunities
          WHERE outcome='OPEN' GROUP BY currency) sums),'[]'::jsonb)
    )
  ) INTO v_result;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_report_summary(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_report_summary(uuid,uuid) TO service_role;
