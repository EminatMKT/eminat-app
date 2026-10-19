-- Tenant and row scoped native CRM reads. Only server-role RPC callers can use it.
CREATE FUNCTION public.native_sales_visible_crm(
  p_organization_id uuid, p_actor_member_id uuid, p_resource text,
  p_limit integer DEFAULT 25, p_offset integer DEFAULT 0,
  p_q text DEFAULT NULL, p_id uuid DEFAULT NULL
) RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role text;
DECLARE v_table text;
DECLARE v_label text;
DECLARE v_entity text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE = '42501';
  END IF;
  IF p_limit NOT BETWEEN 1 AND 100 OR p_offset NOT BETWEEN 0 AND 100000
     OR length(coalesce(p_q,'')) > 200 THEN
    RAISE EXCEPTION 'INVALID_FILTER' USING ERRCODE = '22023';
  END IF;
  CASE p_resource
    WHEN 'contacts' THEN v_table := 'sales_contacts'; v_label := 'display_name'; v_entity := 'contact';
    WHEN 'accounts' THEN v_table := 'sales_accounts'; v_label := 'name'; v_entity := 'account';
    WHEN 'opportunities' THEN v_table := 'sales_opportunities'; v_label := 'name'; v_entity := 'opportunity';
    ELSE RAISE EXCEPTION 'INVALID_RESOURCE' USING ERRCODE = '22023';
  END CASE;
  SELECT m.role INTO v_role FROM public.sales_members m
  JOIN public.sales_organizations o ON o.id = m.organization_id
  WHERE m.id = p_actor_member_id AND m.organization_id = p_organization_id
    AND m.status = 'active' AND o.status = 'active';
  IF v_role IS NULL OR v_role = 'FINANCE' THEN
    RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY EXECUTE format(
    'SELECT to_jsonb(scoped) FROM (
       SELECT r.* FROM public.%I r
       WHERE r.organization_id = $1 AND r.archived_at IS NULL
         AND ($2::uuid IS NULL OR r.id = $2)
         AND ($3::text IS NULL OR position(lower($3) in lower(r.%I)) > 0)
         AND (
           $4 IN (''SUPERADMIN'',''ADMINISTRATOR'',''AUDITOR'')
           OR r.owner_member_id = $7
           OR ($4 = ''SALES_MANAGER'' AND r.team_id IS NOT NULL AND EXISTS (
             SELECT 1 FROM public.sales_team_members tm
             WHERE tm.organization_id = $1 AND tm.member_id = $7 AND tm.team_id = r.team_id
           ))
           OR EXISTS (
             SELECT 1 FROM public.sales_record_grants g
             WHERE g.organization_id = $1 AND g.member_id = $7
               AND g.entity_type = $8 AND g.record_id = r.id AND g.revoked_at IS NULL
           )
         )
       ORDER BY r.created_at DESC, r.id DESC LIMIT $5 OFFSET $6
     ) scoped', v_table, v_label)
  USING p_organization_id, p_id, p_q, v_role, p_limit, p_offset, p_actor_member_id, v_entity;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_visible_crm(uuid,uuid,text,integer,integer,text,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_visible_crm(uuid,uuid,text,integer,integer,text,uuid)
  TO service_role;
