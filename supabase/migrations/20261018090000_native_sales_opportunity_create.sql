-- New Opportunities start at the verified QUALIFIED stage. Stage changes use
-- a separate transition path so create cannot bypass payment or Won rules.
CREATE FUNCTION public.native_sales_create_opportunity(
  p_organization_id uuid, p_actor_member_id uuid,
  p_name text, p_account_id uuid, p_contact_id uuid,
  p_currency varchar(3), p_amount numeric(18,2), p_expected_close_date date,
  p_owner_member_id uuid, p_team_id uuid,
  p_idempotency_key text, p_payload_hash text, p_request_id uuid
) RETURNS public.sales_opportunities
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_actor public.sales_members%ROWTYPE;
DECLARE v_owner uuid;
DECLARE v_team uuid;
DECLARE v_team_count integer;
DECLARE v_stage public.sales_stages%ROWTYPE;
DECLARE v_operation public.sales_write_operations%ROWTYPE;
DECLARE v_opportunity public.sales_opportunities%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE = '42501';
  END IF;
  IF p_name IS NULL OR length(btrim(p_name)) NOT BETWEEN 1 AND 500
    OR p_account_id IS NULL OR p_currency IS NULL OR p_currency !~ '^[A-Z]{3}$'
    OR p_amount < 0 OR p_expected_close_date IS NULL OR p_request_id IS NULL
    OR p_idempotency_key IS NULL OR p_idempotency_key !~ '^[A-Za-z0-9_-]{8,128}$'
    OR p_payload_hash IS NULL OR p_payload_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE = '22023';
  END IF;
  SELECT m.* INTO v_actor FROM public.sales_members m
    JOIN public.sales_organizations o ON o.id = m.organization_id
    WHERE m.id = p_actor_member_id AND m.organization_id = p_organization_id
      AND m.status = 'active' AND o.status = 'active';
  IF NOT FOUND OR v_actor.role NOT IN ('SELLER','SALES_MANAGER','ADMINISTRATOR','SUPERADMIN') THEN
    RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.native_sales_visible_crm(
    p_organization_id,p_actor_member_id,'accounts',1,0,NULL,p_account_id)) THEN
    RAISE EXCEPTION 'ACCOUNT_NOT_AVAILABLE' USING ERRCODE = '22023';
  END IF;
  IF p_contact_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.native_sales_visible_crm(
    p_organization_id,p_actor_member_id,'contacts',1,0,NULL,p_contact_id)) THEN
    RAISE EXCEPTION 'CONTACT_NOT_AVAILABLE' USING ERRCODE = '22023';
  END IF;
  SELECT s.* INTO v_stage FROM public.sales_stages s
    JOIN public.sales_pipelines p ON p.organization_id = s.organization_id AND p.id = s.pipeline_id
    WHERE s.organization_id = p_organization_id AND s.code = 'QUALIFIED' AND p.active
    ORDER BY p.created_at, p.id LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'PIPELINE_NOT_INITIALIZED' USING ERRCODE = 'P0001'; END IF;
  v_owner := coalesce(p_owner_member_id, p_actor_member_id);
  IF v_owner <> p_actor_member_id AND v_actor.role NOT IN ('SALES_MANAGER','ADMINISTRATOR','SUPERADMIN') THEN
    RAISE EXCEPTION 'REASSIGN_FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sales_members
    WHERE organization_id = p_organization_id AND id = v_owner AND status = 'active') THEN
    RAISE EXCEPTION 'OWNER_NOT_ELIGIBLE' USING ERRCODE = '22023';
  END IF;
  v_team := p_team_id;
  IF v_team IS NULL THEN
    SELECT count(*), (array_agg(team_id))[1] INTO v_team_count, v_team
      FROM public.sales_team_members WHERE organization_id = p_organization_id AND member_id = v_owner;
    IF v_team_count <> 1 THEN v_team := NULL; END IF;
  END IF;
  IF v_team IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.sales_team_members tm
    JOIN public.sales_teams t ON t.organization_id=tm.organization_id AND t.id=tm.team_id
    WHERE tm.organization_id=p_organization_id AND tm.member_id=v_owner AND tm.team_id=v_team AND t.active
  ) THEN RAISE EXCEPTION 'OWNER_TEAM_MISMATCH' USING ERRCODE = '22023'; END IF;
  IF v_actor.role IN ('SELLER','SALES_MANAGER') AND v_team IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.sales_team_members tm
    WHERE tm.organization_id=p_organization_id AND tm.member_id=p_actor_member_id AND tm.team_id=v_team
  ) THEN RAISE EXCEPTION 'TEAM_FORBIDDEN' USING ERRCODE = '42501'; END IF;
  IF v_actor.role='SALES_MANAGER' AND v_owner<>p_actor_member_id AND v_team IS NULL THEN
    RAISE EXCEPTION 'OWNER_OUT_OF_SCOPE' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.sales_write_operations
    (organization_id,actor_member_id,operation,idempotency_key,payload_hash)
    VALUES (p_organization_id,p_actor_member_id,'opportunity.create',p_idempotency_key,p_payload_hash)
    ON CONFLICT (organization_id,actor_member_id,operation,idempotency_key) DO NOTHING;
  SELECT * INTO v_operation FROM public.sales_write_operations
    WHERE organization_id=p_organization_id AND actor_member_id=p_actor_member_id
      AND operation='opportunity.create' AND idempotency_key=p_idempotency_key FOR UPDATE;
  IF v_operation.payload_hash <> p_payload_hash THEN
    RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE = '23505';
  END IF;
  IF v_operation.record_id IS NOT NULL THEN
    SELECT * INTO v_opportunity FROM public.sales_opportunities
      WHERE organization_id=p_organization_id AND id=v_operation.record_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'OPERATION_INCOMPLETE' USING ERRCODE='P0001'; END IF;
    RETURN v_opportunity;
  END IF;
  INSERT INTO public.sales_opportunities (
    organization_id,owner_member_id,team_id,name,account_id,primary_contact_id,
    stage_id,probability,currency,amount,expected_close_date,created_by,updated_by)
    VALUES (p_organization_id,v_owner,v_team,btrim(p_name),p_account_id,p_contact_id,
      v_stage.id,v_stage.probability,p_currency,p_amount,p_expected_close_date,
      p_actor_member_id,p_actor_member_id) RETURNING * INTO v_opportunity;
  IF p_contact_id IS NOT NULL THEN
    INSERT INTO public.sales_opportunity_contacts (organization_id,opportunity_id,contact_id)
      VALUES (p_organization_id,v_opportunity.id,p_contact_id);
  END IF;
  UPDATE public.sales_write_operations SET record_id=v_opportunity.id WHERE id=v_operation.id;
  INSERT INTO public.sales_history (organization_id,entity_type,record_id,actor_member_id,
    action,request_id,changes)
    VALUES (p_organization_id,'opportunity',v_opportunity.id,p_actor_member_id,
      'created',p_request_id,jsonb_build_object('stage',jsonb_build_object('to','QUALIFIED')));
  RETURN v_opportunity;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_create_opportunity(uuid,uuid,text,uuid,uuid,varchar,numeric,date,uuid,uuid,text,text,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_create_opportunity(uuid,uuid,text,uuid,uuid,varchar,numeric,date,uuid,uuid,text,text,uuid)
  TO service_role;
