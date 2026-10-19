-- Versioned Opportunity detail edits. Stage and ownership retain dedicated paths.
CREATE FUNCTION public.native_sales_update_opportunity(
  p_organization_id uuid,p_actor_member_id uuid,p_opportunity_id uuid,
  p_expected_version integer,p_patch jsonb,p_request_id uuid
) RETURNS public.sales_opportunities
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role text;
DECLARE v_before public.sales_opportunities%ROWTYPE;
DECLARE v_after public.sales_opportunities%ROWTYPE;
DECLARE v_contact uuid;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  IF p_expected_version<1 OR p_request_id IS NULL OR p_patch IS NULL
    OR jsonb_typeof(p_patch)<>'object' OR p_patch='{}'::jsonb
    OR EXISTS (SELECT 1 FROM jsonb_object_keys(p_patch) AS key WHERE key NOT IN
      ('name','amount','currency','expectedCloseDate','description','source','product','primaryContactId','nextFollowUpAt'))
    OR (p_patch ? 'name' AND length(btrim(coalesce(p_patch->>'name',''))) NOT BETWEEN 1 AND 500)
    OR (p_patch ? 'amount' AND p_patch->>'amount' IS NOT NULL AND (p_patch->>'amount') !~ '^\d{1,16}(\.\d{1,2})?$')
    OR (p_patch ? 'currency' AND coalesce(p_patch->>'currency','') !~ '^[A-Z]{3}$')
    OR length(coalesce(p_patch->>'description',''))>10000
    OR length(coalesce(p_patch->>'source',''))>500
    OR length(coalesce(p_patch->>'product',''))>500 THEN
    RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE='22023';
  END IF;
  SELECT m.role INTO v_role FROM public.sales_members m
    JOIN public.sales_organizations o ON o.id=m.organization_id
    WHERE m.organization_id=p_organization_id AND m.id=p_actor_member_id
      AND m.status='active' AND o.status='active';
  IF v_role NOT IN ('SELLER','SALES_MANAGER','ADMINISTRATOR','SUPERADMIN') OR v_role IS NULL THEN
    RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_before FROM public.sales_opportunities
    WHERE organization_id=p_organization_id AND id=p_opportunity_id AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'OPPORTUNITY_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  IF v_role NOT IN ('SUPERADMIN','ADMINISTRATOR')
    AND v_before.owner_member_id<>p_actor_member_id
    AND NOT (v_role='SALES_MANAGER' AND EXISTS (
      SELECT 1 FROM public.sales_team_members tm WHERE tm.organization_id=p_organization_id
        AND tm.member_id=p_actor_member_id AND tm.team_id=v_before.team_id))
    AND NOT EXISTS (SELECT 1 FROM public.sales_record_grants g
      WHERE g.organization_id=p_organization_id AND g.member_id=p_actor_member_id
        AND g.entity_type='opportunity' AND g.record_id=p_opportunity_id
        AND g.can_write AND g.revoked_at IS NULL) THEN
    RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE='42501';
  END IF;
  IF v_before.version<>p_expected_version THEN
    RAISE EXCEPTION 'VERSION_CONFLICT' USING ERRCODE='40001';
  END IF;
  IF p_patch ? 'amount' AND (EXISTS (
    SELECT 1 FROM public.sales_stages s WHERE s.organization_id=p_organization_id
      AND s.id=v_before.stage_id AND s.outcome<>'OPEN') OR EXISTS (
    SELECT 1 FROM public.sales_payments p WHERE p.organization_id=p_organization_id
      AND p.opportunity_id=p_opportunity_id)) THEN
    RAISE EXCEPTION 'AMOUNT_LOCKED' USING ERRCODE='23514';
  END IF;
  IF p_patch ? 'primaryContactId' THEN
    IF p_patch->>'primaryContactId' IS NOT NULL THEN
      v_contact:=(p_patch->>'primaryContactId')::uuid;
      IF NOT EXISTS (SELECT 1 FROM public.native_sales_visible_crm(
        p_organization_id,p_actor_member_id,'contacts',1,0,NULL,v_contact)) THEN
        RAISE EXCEPTION 'CONTACT_NOT_AVAILABLE' USING ERRCODE='42501';
      END IF;
    END IF;
  END IF;
  UPDATE public.sales_opportunities SET
    name=CASE WHEN p_patch ? 'name' THEN btrim(p_patch->>'name') ELSE name END,
    amount=CASE WHEN p_patch ? 'amount' THEN (p_patch->>'amount')::numeric(18,2) ELSE amount END,
    currency=CASE WHEN p_patch ? 'currency' THEN p_patch->>'currency' ELSE currency END,
    expected_close_date=CASE WHEN p_patch ? 'expectedCloseDate' THEN (p_patch->>'expectedCloseDate')::date ELSE expected_close_date END,
    description=CASE WHEN p_patch ? 'description' THEN p_patch->>'description' ELSE description END,
    source=CASE WHEN p_patch ? 'source' THEN p_patch->>'source' ELSE source END,
    product=CASE WHEN p_patch ? 'product' THEN p_patch->>'product' ELSE product END,
    primary_contact_id=CASE WHEN p_patch ? 'primaryContactId' THEN v_contact ELSE primary_contact_id END,
    next_follow_up_at=CASE WHEN p_patch ? 'nextFollowUpAt' THEN (p_patch->>'nextFollowUpAt')::timestamptz ELSE next_follow_up_at END,
    version=version+1,updated_by=p_actor_member_id,updated_at=now()
    WHERE organization_id=p_organization_id AND id=p_opportunity_id RETURNING * INTO v_after;
  IF p_patch ? 'primaryContactId' AND v_contact IS NOT NULL THEN
    INSERT INTO public.sales_opportunity_contacts(organization_id,opportunity_id,contact_id)
      VALUES (p_organization_id,p_opportunity_id,v_contact)
      ON CONFLICT (organization_id,opportunity_id,contact_id) DO NOTHING;
  END IF;
  INSERT INTO public.sales_history(organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
    VALUES (p_organization_id,'opportunity',p_opportunity_id,p_actor_member_id,'updated',p_request_id,
      jsonb_build_object('fields',(SELECT jsonb_agg(key ORDER BY key) FROM jsonb_object_keys(p_patch) AS key)));
  RETURN v_after;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_update_opportunity(uuid,uuid,uuid,integer,jsonb,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_update_opportunity(uuid,uuid,uuid,integer,jsonb,uuid)
  TO service_role;
