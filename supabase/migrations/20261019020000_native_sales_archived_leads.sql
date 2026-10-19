-- Staff-only archived Lead discovery for reversible archive/restore.
CREATE FUNCTION public.native_sales_archived_leads(
  p_organization_id uuid, p_actor_member_id uuid,
  p_limit integer DEFAULT 25, p_offset integer DEFAULT 0, p_q text DEFAULT NULL
) RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  IF p_limit NOT BETWEEN 1 AND 100 OR p_offset NOT BETWEEN 0 AND 100000
    OR length(coalesce(p_q,'')) > 200 THEN
    RAISE EXCEPTION 'INVALID_FILTER' USING ERRCODE='22023';
  END IF;
  SELECT m.role INTO v_role FROM public.sales_members m
    JOIN public.sales_organizations o ON o.id=m.organization_id
    WHERE m.id=p_actor_member_id AND m.organization_id=p_organization_id
      AND m.status='active' AND o.status='active';
  IF v_role NOT IN ('SUPERADMIN','ADMINISTRATOR','SALES_MANAGER') OR v_role IS NULL THEN
    RAISE EXCEPTION 'ARCHIVE_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  RETURN QUERY SELECT to_jsonb(l) FROM public.sales_leads l
    WHERE l.organization_id=p_organization_id AND l.archived_at IS NOT NULL
      AND (p_q IS NULL OR position(lower(p_q) in lower(l.display_name)) > 0)
      AND (v_role <> 'SALES_MANAGER' OR l.owner_member_id=p_actor_member_id OR EXISTS (
        SELECT 1 FROM public.sales_team_members tm
          WHERE tm.organization_id=p_organization_id AND tm.member_id=p_actor_member_id
            AND tm.team_id=l.team_id
      ))
    ORDER BY l.archived_at DESC,l.id DESC LIMIT p_limit OFFSET p_offset;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_archived_leads(uuid,uuid,integer,integer,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_archived_leads(uuid,uuid,integer,integer,text)
  TO service_role;
