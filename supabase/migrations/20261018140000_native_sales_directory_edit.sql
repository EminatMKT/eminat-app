-- Versioned native Contact/Account edits. Owner, team, and explicit record
-- grants are checked inside the same transaction as the mutation.
CREATE FUNCTION public.native_sales_update_directory_record(
  p_organization_id uuid, p_actor_member_id uuid, p_resource text,
  p_record_id uuid, p_expected_version integer, p_patch jsonb, p_request_id uuid
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_actor public.sales_members%ROWTYPE;
DECLARE v_contact public.sales_contacts%ROWTYPE;
DECLARE v_account public.sales_accounts%ROWTYPE;
DECLARE v_allowed boolean;
DECLARE v_owner uuid;
DECLARE v_team uuid;
DECLARE v_account_id uuid;
DECLARE v_result jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  IF p_resource NOT IN ('contacts','accounts') OR p_record_id IS NULL
    OR p_expected_version IS NULL OR p_expected_version<1 OR p_request_id IS NULL
    OR p_patch IS NULL OR jsonb_typeof(p_patch)<>'object' OR p_patch='{}'::jsonb
    OR EXISTS (SELECT 1 FROM jsonb_object_keys(p_patch) AS key
      WHERE key NOT IN ('displayName','name','email','phone','source','type','primaryAccountId'))
    OR (p_resource='contacts' AND (p_patch ? 'name' OR p_patch ? 'type'))
    OR (p_resource='accounts' AND (p_patch ? 'displayName' OR p_patch ? 'primaryAccountId'))
    OR (p_patch ? 'displayName' AND length(btrim(coalesce(p_patch->>'displayName',''))) NOT BETWEEN 1 AND 500)
    OR (p_patch ? 'name' AND length(btrim(coalesce(p_patch->>'name',''))) NOT BETWEEN 1 AND 500)
    OR length(coalesce(p_patch->>'email',''))>320
    OR length(coalesce(p_patch->>'phone',''))>80
    OR length(coalesce(p_patch->>'source',''))>500
    OR (p_patch ? 'type' AND p_patch->>'type' NOT IN ('prospect','customer','partner')) THEN
    RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE='22023';
  END IF;
  SELECT m.* INTO v_actor FROM public.sales_members m
    JOIN public.sales_organizations o ON o.id=m.organization_id
    WHERE m.organization_id=p_organization_id AND m.id=p_actor_member_id
      AND m.status='active' AND o.status='active';
  IF NOT FOUND OR v_actor.role NOT IN ('SELLER','SALES_MANAGER','ADMINISTRATOR','SUPERADMIN') THEN
    RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE='42501';
  END IF;
  IF p_resource='contacts' THEN
    SELECT * INTO v_contact FROM public.sales_contacts
      WHERE organization_id=p_organization_id AND id=p_record_id AND archived_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'CONTACT_NOT_FOUND' USING ERRCODE='P0002'; END IF;
    v_owner:=v_contact.owner_member_id; v_team:=v_contact.team_id;
  ELSE
    SELECT * INTO v_account FROM public.sales_accounts
      WHERE organization_id=p_organization_id AND id=p_record_id AND archived_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'ACCOUNT_NOT_FOUND' USING ERRCODE='P0002'; END IF;
    v_owner:=v_account.owner_member_id; v_team:=v_account.team_id;
  END IF;
  v_allowed := v_actor.role IN ('ADMINISTRATOR','SUPERADMIN') OR v_owner=p_actor_member_id
    OR (v_actor.role='SALES_MANAGER' AND EXISTS (
      SELECT 1 FROM public.sales_team_members tm
      WHERE tm.organization_id=p_organization_id AND tm.member_id=p_actor_member_id
        AND tm.team_id=v_team))
    OR EXISTS (SELECT 1 FROM public.sales_record_grants g
      WHERE g.organization_id=p_organization_id AND g.entity_type=left(p_resource,length(p_resource)-1)
        AND g.record_id=p_record_id AND g.member_id=p_actor_member_id
        AND g.can_write AND g.revoked_at IS NULL);
  IF NOT v_allowed THEN RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  IF (p_resource='contacts' AND v_contact.version<>p_expected_version)
    OR (p_resource='accounts' AND v_account.version<>p_expected_version) THEN
    RAISE EXCEPTION 'VERSION_CONFLICT' USING ERRCODE='40001';
  END IF;
  IF p_resource='contacts' THEN
    IF p_patch ? 'primaryAccountId' AND p_patch->>'primaryAccountId' IS NOT NULL THEN
      BEGIN v_account_id:=(p_patch->>'primaryAccountId')::uuid;
      EXCEPTION WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE='22023'; END;
      IF NOT EXISTS (SELECT 1 FROM public.native_sales_visible_crm(
        p_organization_id,p_actor_member_id,'accounts',1,0,NULL,v_account_id)) THEN
        RAISE EXCEPTION 'ACCOUNT_NOT_AVAILABLE' USING ERRCODE='42501';
      END IF;
    END IF;
    UPDATE public.sales_contacts SET
      display_name=CASE WHEN p_patch ? 'displayName' THEN btrim(p_patch->>'displayName') ELSE display_name END,
      email=CASE WHEN p_patch ? 'email' THEN p_patch->>'email' ELSE email END,
      phone=CASE WHEN p_patch ? 'phone' THEN p_patch->>'phone' ELSE phone END,
      source=CASE WHEN p_patch ? 'source' THEN p_patch->>'source' ELSE source END,
      primary_account_id=CASE WHEN p_patch ? 'primaryAccountId' THEN v_account_id ELSE primary_account_id END,
      version=version+1,updated_by=p_actor_member_id,updated_at=now()
      WHERE organization_id=p_organization_id AND id=p_record_id RETURNING to_jsonb(sales_contacts.*) INTO v_result;
    IF v_account_id IS NOT NULL THEN
      INSERT INTO public.sales_account_contacts(organization_id,account_id,contact_id,is_primary)
        VALUES (p_organization_id,v_account_id,p_record_id,true)
        ON CONFLICT (organization_id,account_id,contact_id) DO UPDATE SET active=true,is_primary=true;
    END IF;
  ELSE
    UPDATE public.sales_accounts SET
      name=CASE WHEN p_patch ? 'name' THEN btrim(p_patch->>'name') ELSE name END,
      email=CASE WHEN p_patch ? 'email' THEN p_patch->>'email' ELSE email END,
      phone=CASE WHEN p_patch ? 'phone' THEN p_patch->>'phone' ELSE phone END,
      source=CASE WHEN p_patch ? 'source' THEN p_patch->>'source' ELSE source END,
      type=CASE WHEN p_patch ? 'type' THEN p_patch->>'type' ELSE type END,
      version=version+1,updated_by=p_actor_member_id,updated_at=now()
      WHERE organization_id=p_organization_id AND id=p_record_id RETURNING to_jsonb(sales_accounts.*) INTO v_result;
  END IF;
  INSERT INTO public.sales_history
    (organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
    VALUES (p_organization_id,left(p_resource,length(p_resource)-1),p_record_id,
      p_actor_member_id,'updated',p_request_id,
      jsonb_build_object('fields',(SELECT jsonb_agg(key ORDER BY key) FROM jsonb_object_keys(p_patch) AS key)));
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_update_directory_record(uuid,uuid,text,uuid,integer,jsonb,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_update_directory_record(uuid,uuid,text,uuid,integer,jsonb,uuid)
  TO service_role;
