-- Payment evidence is a staff record, never a processor transaction. The
-- opportunity visibility check is repeated in SQL so API routing cannot
-- bypass tenant or Seller scope.
CREATE FUNCTION public.native_sales_visible_payment_evidence(
  p_organization_id uuid,p_actor_member_id uuid,p_opportunity_id uuid
) RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  SELECT role INTO v_role FROM public.sales_members
    WHERE organization_id=p_organization_id AND id=p_actor_member_id AND status='active';
  IF v_role IS NULL OR v_role NOT IN ('SUPERADMIN','ADMINISTRATOR','SALES_MANAGER','SELLER','AUDITOR')
    OR p_opportunity_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.native_sales_visible_crm(
        p_organization_id,p_actor_member_id,'opportunities',1,0,NULL,p_opportunity_id)) THEN
    RAISE EXCEPTION 'OPPORTUNITY_NOT_FOUND' USING ERRCODE='P0002';
  END IF;
  RETURN QUERY SELECT to_jsonb(p) || jsonb_build_object('used',EXISTS (
    SELECT 1 FROM public.sales_memberships m WHERE m.organization_id=p_organization_id
      AND m.sales_payment_id=p.id))
    FROM public.sales_payments p
    WHERE p.organization_id=p_organization_id AND p.opportunity_id=p_opportunity_id
    ORDER BY p.created_at DESC,p.id DESC LIMIT 100;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_visible_payment_evidence(uuid,uuid,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_visible_payment_evidence(uuid,uuid,uuid)
  TO service_role;
