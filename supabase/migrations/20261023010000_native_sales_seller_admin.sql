-- An existing LILLY administrator can grant or revoke only a SELLER membership.
-- The operation is atomic with its audit row and never changes assignment order.
CREATE FUNCTION public.native_sales_admin_set_seller(
  p_actor_user_id uuid, p_target_user_id uuid, p_organization_id uuid,
  p_active boolean
) RETURNS public.sales_members
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_actor public.usuarios%ROWTYPE;
DECLARE v_target public.usuarios%ROWTYPE;
DECLARE v_member public.sales_members%ROWTYPE;
DECLARE v_status text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  IF p_actor_user_id IS NULL OR p_target_user_id IS NULL OR
    p_organization_id IS NULL OR p_active IS NULL THEN
    RAISE EXCEPTION 'SELLER_ADMIN_INPUT_INVALID' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_actor FROM public.usuarios
    WHERE id=p_actor_user_id AND activo=true AND rol='admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SELLER_ADMIN_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_target FROM public.usuarios
    WHERE id=p_target_user_id FOR UPDATE;
  IF NOT FOUND OR v_target.auth_id IS NULL THEN
    RAISE EXCEPTION 'SELLER_IDENTITY_REQUIRED' USING ERRCODE='22023';
  END IF;
  IF length(btrim(concat_ws(' ',v_target.nombre,v_target.apellido))) NOT BETWEEN 1 AND 160 THEN
    RAISE EXCEPTION 'SELLER_NAME_REQUIRED' USING ERRCODE='22023';
  END IF;
  IF p_active AND (v_target.activo IS DISTINCT FROM true OR
    v_target.validado IS DISTINCT FROM true) THEN
    RAISE EXCEPTION 'SELLER_ACTIVE_IDENTITY_REQUIRED' USING ERRCODE='22023';
  END IF;
  IF p_active AND EXISTS (SELECT 1 FROM public.sales_patient_identities
    WHERE auth_id=v_target.auth_id) THEN
    RAISE EXCEPTION 'PATIENT_IDENTITY_CANNOT_SELL' USING ERRCODE='42501';
  END IF;
  PERFORM 1 FROM public.sales_organizations
    WHERE id=p_organization_id AND status='active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SELLER_ORGANIZATION_INACTIVE' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_member FROM public.sales_members
    WHERE organization_id=p_organization_id AND user_id=p_target_user_id FOR UPDATE;
  IF FOUND AND v_member.role<>'SELLER' THEN
    RAISE EXCEPTION 'SELLER_ROLE_CHANGE_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  IF NOT FOUND AND NOT p_active THEN
    RAISE EXCEPTION 'SELLER_MEMBERSHIP_NOT_FOUND' USING ERRCODE='P0002';
  END IF;
  v_status := CASE WHEN p_active THEN 'active' ELSE 'revoked' END;
  IF v_member.id IS NOT NULL AND v_member.status=v_status THEN RETURN v_member; END IF;
  IF v_member.id IS NULL THEN
    INSERT INTO public.sales_members
      (organization_id,user_id,auth_id,display_name,role,status,evidence_ref,
       approved_by,approved_at)
    VALUES (p_organization_id,v_target.id,v_target.auth_id,
      btrim(concat_ws(' ',v_target.nombre,v_target.apellido)),
      'SELLER','active','LILLY_ADMIN_UI:'||p_actor_user_id::text,
      p_actor_user_id,now()) RETURNING * INTO v_member;
  ELSE
    UPDATE public.sales_members SET status=v_status,auth_id=v_target.auth_id,
      display_name=btrim(concat_ws(' ',v_target.nombre,v_target.apellido)),
      approved_by=p_actor_user_id,approved_at=now(),updated_at=now()
      WHERE id=v_member.id RETURNING * INTO v_member;
  END IF;
  INSERT INTO public.sales_history
    (organization_id,entity_type,record_id,action,request_id,changes)
  VALUES (p_organization_id,'sales_member',v_member.id,
    CASE WHEN p_active THEN 'seller_access_granted' ELSE 'seller_access_revoked' END,
    gen_random_uuid(),jsonb_build_object('actorUserId',p_actor_user_id,
      'targetUserId',p_target_user_id,'role','SELLER','status',v_status));
  RETURN v_member;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_admin_set_seller(uuid,uuid,uuid,boolean)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_admin_set_seller(uuid,uuid,uuid,boolean)
  TO service_role;
