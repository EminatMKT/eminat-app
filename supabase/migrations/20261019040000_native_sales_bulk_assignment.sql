-- One atomic staff operation. A rejected row rolls back every reassignment.
CREATE FUNCTION public.native_sales_bulk_reassign_leads(
  p_organization_id uuid,p_actor_member_id uuid,p_items jsonb,
  p_owner_member_id uuid,p_team_id uuid,p_request_id uuid
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_item jsonb;
DECLARE v_count integer;
DECLARE v_seen uuid[] := ARRAY[]::uuid[];
DECLARE v_id uuid;
DECLARE v_version integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  IF p_request_id IS NULL OR p_owner_member_id IS NULL OR jsonb_typeof(p_items)<>'array' THEN
    RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE='22023';
  END IF;
  v_count:=jsonb_array_length(p_items);
  IF v_count NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE='22023'; END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) ORDER BY value->>'id' LOOP
    IF jsonb_typeof(v_item)<>'object' OR NOT (v_item ? 'id' AND v_item ? 'version')
      OR (SELECT count(*) FROM jsonb_object_keys(v_item))<>2
      OR coalesce(v_item->>'id','') !~ '^[0-9a-fA-F-]{36}$'
      OR coalesce(v_item->>'version','') !~ '^[1-9][0-9]*$' THEN
      RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE='22023';
    END IF;
    v_id:=(v_item->>'id')::uuid;
    v_version:=(v_item->>'version')::integer;
    IF v_id=ANY(v_seen) THEN RAISE EXCEPTION 'DUPLICATE_LEAD' USING ERRCODE='23505'; END IF;
    v_seen:=array_append(v_seen,v_id);
    PERFORM public.native_sales_reassign_lead(p_organization_id,p_actor_member_id,v_id,
      v_version,p_owner_member_id,p_team_id,p_request_id);
  END LOOP;
  RETURN jsonb_build_object('count',v_count,'requestId',p_request_id);
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_bulk_reassign_leads(uuid,uuid,jsonb,uuid,uuid,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_bulk_reassign_leads(uuid,uuid,jsonb,uuid,uuid,uuid)
  TO service_role;
