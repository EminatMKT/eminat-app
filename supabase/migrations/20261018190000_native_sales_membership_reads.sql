-- Native membership list/detail reads share the Seller/team boundary used by
-- commercial writes. Dependants remain linked to the paid primary record.
CREATE FUNCTION public.native_sales_visible_memberships(
  p_organization_id uuid,p_actor_member_id uuid,p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0,p_q text DEFAULT NULL,p_id uuid DEFAULT NULL,
  p_demo boolean DEFAULT NULL
) RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  IF p_limit NOT BETWEEN 1 AND 100 OR p_offset NOT BETWEEN 0 AND 100000
    OR length(coalesce(p_q,''))>160 THEN
    RAISE EXCEPTION 'INVALID_FILTER' USING ERRCODE='22023';
  END IF;
  SELECT m.role INTO v_role FROM public.sales_members m
    JOIN public.sales_organizations o ON o.id=m.organization_id
    WHERE m.organization_id=p_organization_id AND m.id=p_actor_member_id
      AND m.status='active' AND o.status='active';
  IF v_role IS NULL OR v_role='FINANCE' THEN
    RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE='42501';
  END IF;
  RETURN QUERY SELECT to_jsonb(m) || jsonb_build_object(
    'effectiveStatus',CASE WHEN m.status='ACTIVE' AND m.expires_at<current_date
      THEN 'EXPIRED' ELSE m.status END,
    'household',coalesce((SELECT jsonb_agg(jsonb_build_object(
      'id',h.id,'contactId',h.contact_id,'displayName',c.display_name,
      'relationship',h.relationship,'status',h.status,'memberIndex',h.member_index,
      'code',coalesce(h.code,CASE WHEN h.relationship='PRIMARY' THEN m.code END))
      ORDER BY h.member_index)
      FROM public.sales_household_members h
      JOIN public.sales_contacts c ON c.organization_id=h.organization_id AND c.id=h.contact_id
      WHERE h.organization_id=m.organization_id AND h.membership_id=m.id), '[]'::jsonb))
    FROM public.sales_memberships m
    WHERE m.organization_id=p_organization_id
      AND (p_id IS NULL OR m.id=p_id)
      AND (p_demo IS NULL OR m.is_demo=p_demo)
      AND (p_q IS NULL OR position(lower(p_q) in lower(m.code))>0
        OR position(lower(p_q) in lower(m.first_name || ' ' || m.last_name))>0)
      AND (v_role IN ('SUPERADMIN','ADMINISTRATOR','AUDITOR')
        OR m.seller_member_id=p_actor_member_id
        OR (v_role='SALES_MANAGER' AND m.team_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.sales_team_members tm
          WHERE tm.organization_id=p_organization_id AND tm.member_id=p_actor_member_id
            AND tm.team_id=m.team_id)))
    ORDER BY m.created_at DESC,m.id DESC LIMIT p_limit OFFSET p_offset;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_visible_memberships(uuid,uuid,integer,integer,text,uuid,boolean)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_visible_memberships(uuid,uuid,integer,integer,text,uuid,boolean)
  TO service_role;
