-- Unified activity inbox. Each row is visible only through a permitted CRM
-- parent; assignee alone never grants access to another Seller's record.
CREATE FUNCTION public.native_sales_activity_inbox(
  p_organization_id uuid,p_actor_member_id uuid,p_status text DEFAULT NULL,
  p_limit integer DEFAULT 50,p_offset integer DEFAULT 0
) RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  IF p_limit NOT BETWEEN 1 AND 100 OR p_offset NOT BETWEEN 0 AND 100000
    OR (p_status IS NOT NULL AND p_status NOT IN ('PENDING','COMPLETED','CANCELLED','FAILED')) THEN
    RAISE EXCEPTION 'INVALID_FILTER' USING ERRCODE='22023';
  END IF;
  SELECT m.role INTO v_role FROM public.sales_members m
    JOIN public.sales_organizations o ON o.id=m.organization_id
    WHERE m.organization_id=p_organization_id AND m.id=p_actor_member_id
      AND m.status='active' AND o.status='active';
  IF v_role IS NULL OR v_role='FINANCE' THEN
    RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE='42501';
  END IF;
  RETURN QUERY SELECT to_jsonb(a) || jsonb_build_object(
    'relatedName',coalesce(l.display_name,c.display_name,ac.name,op.name,'General task'),
    'relatedType',CASE WHEN a.lead_id IS NOT NULL THEN 'lead'
      WHEN a.contact_id IS NOT NULL THEN 'contact'
      WHEN a.account_id IS NOT NULL THEN 'account'
      WHEN a.opportunity_id IS NOT NULL THEN 'opportunity' ELSE 'general' END)
    FROM public.sales_activities a
    LEFT JOIN public.sales_leads l ON l.organization_id=a.organization_id AND l.id=a.lead_id
    LEFT JOIN public.sales_contacts c ON c.organization_id=a.organization_id AND c.id=a.contact_id
    LEFT JOIN public.sales_accounts ac ON ac.organization_id=a.organization_id AND ac.id=a.account_id
    LEFT JOIN public.sales_opportunities op ON op.organization_id=a.organization_id AND op.id=a.opportunity_id
    WHERE a.organization_id=p_organization_id AND (p_status IS NULL OR a.status=p_status)
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
    ORDER BY a.created_at DESC,a.id DESC LIMIT p_limit OFFSET p_offset;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_activity_inbox(uuid,uuid,text,integer,integer)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_activity_inbox(uuid,uuid,text,integer,integer)
  TO service_role;
