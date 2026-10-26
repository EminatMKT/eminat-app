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
