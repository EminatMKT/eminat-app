-- Renewal approval is commercial review only. It never extends coverage,
-- issues an invoice, or marks a payment complete.
CREATE FUNCTION public.native_sales_renewal_access(
  p_organization_id uuid,p_actor_member_id uuid,p_membership_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT auth.role() = 'service_role' AND EXISTS (
    SELECT 1 FROM public.native_sales_visible_memberships(
      p_organization_id,p_actor_member_id,1,0,NULL,p_membership_id,NULL));
$$;

CREATE FUNCTION public.native_sales_list_renewal_requests(
  p_organization_id uuid,p_actor_member_id uuid,p_membership_id uuid
) RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  IF NOT public.native_sales_renewal_access(p_organization_id,p_actor_member_id,p_membership_id) THEN
    RAISE EXCEPTION 'MEMBERSHIP_NOT_FOUND' USING ERRCODE='P0002';
  END IF;
  RETURN QUERY SELECT jsonb_build_object(
    'id',r.id,'status',r.status,'plan',r.requested_plan,'duration',r.requested_duration,
    'createdAt',r.created_at,'reviewedAt',r.reviewed_at,'reviewedBy',r.reviewed_by,
    'decisionNote',r.decision_note)
    FROM public.sales_renewal_requests r
    WHERE r.organization_id=p_organization_id AND r.membership_id=p_membership_id
    ORDER BY r.created_at DESC,r.id DESC LIMIT 100;
END;
$$;

CREATE FUNCTION public.native_sales_request_renewal(
  p_organization_id uuid,p_actor_member_id uuid,p_membership_id uuid,
  p_plan text,p_duration text,p_idempotency_key text,p_request_id uuid
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_member public.sales_members%ROWTYPE;
DECLARE v_membership public.sales_memberships%ROWTYPE;
DECLARE v_existing public.sales_renewal_requests%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  IF p_membership_id IS NULL OR p_request_id IS NULL OR p_plan IS NULL
    OR p_plan NOT IN ('ESSENTIAL','PLUS','MAX') OR p_duration IS NULL
    OR p_duration NOT IN ('MONTHLY','3M','6M','12M') OR p_idempotency_key IS NULL
    OR p_idempotency_key !~ '^[A-Za-z0-9_-]{8,128}$' THEN
    RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_member FROM public.sales_members WHERE organization_id=p_organization_id
    AND id=p_actor_member_id AND status='active';
  IF NOT FOUND OR v_member.role NOT IN ('SELLER','SALES_MANAGER','ADMINISTRATOR','SUPERADMIN') THEN
    RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_membership FROM public.sales_memberships
    WHERE organization_id=p_organization_id AND id=p_membership_id FOR UPDATE;
  IF NOT FOUND OR NOT public.native_sales_renewal_access(p_organization_id,p_actor_member_id,p_membership_id) THEN
    RAISE EXCEPTION 'MEMBERSHIP_NOT_FOUND' USING ERRCODE='P0002';
  END IF;
  SELECT * INTO v_existing FROM public.sales_renewal_requests
    WHERE organization_id=p_organization_id AND idempotency_key=p_idempotency_key;
  IF FOUND THEN
    IF v_existing.membership_id<>p_membership_id OR v_existing.requested_plan<>p_plan
      OR v_existing.requested_duration<>p_duration OR v_existing.requested_by<>p_actor_member_id THEN
      RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE='23505';
    END IF;
    RETURN to_jsonb(v_existing) || jsonb_build_object('replayed',true);
  END IF;
  IF v_membership.status NOT IN ('ACTIVE','EXPIRED')
    OR v_membership.expires_at>(now() AT TIME ZONE 'America/New_York')::date+30 THEN
    RAISE EXCEPTION 'RENEWAL_NOT_ELIGIBLE' USING ERRCODE='22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.sales_renewal_requests
      WHERE organization_id=p_organization_id AND membership_id=p_membership_id AND status='PENDING') THEN
    RAISE EXCEPTION 'RENEWAL_ALREADY_PENDING' USING ERRCODE='23505';
  END IF;
  INSERT INTO public.sales_renewal_requests
    (organization_id,membership_id,requested_by,requested_plan,requested_duration,idempotency_key)
    VALUES (p_organization_id,p_membership_id,p_actor_member_id,p_plan,p_duration,p_idempotency_key)
    RETURNING * INTO v_existing;
  INSERT INTO public.sales_history
    (organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
    VALUES (p_organization_id,'membership',p_membership_id,p_actor_member_id,'renewal.requested',p_request_id,
      jsonb_build_object('renewalRequestId',v_existing.id,'plan',p_plan,'duration',p_duration));
  RETURN to_jsonb(v_existing) || jsonb_build_object('replayed',false);
END;
$$;

CREATE FUNCTION public.native_sales_review_renewal(
  p_organization_id uuid,p_actor_member_id uuid,p_membership_id uuid,
  p_renewal_request_id uuid,p_decision text,p_note text,p_request_id uuid
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role text;
DECLARE v_request public.sales_renewal_requests%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  IF p_request_id IS NULL OR p_renewal_request_id IS NULL OR p_decision IS NULL
    OR p_decision NOT IN ('APPROVED','REJECTED')
    OR length(coalesce(p_note,''))>1000 THEN
    RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE='22023';
  END IF;
  SELECT role INTO v_role FROM public.sales_members WHERE organization_id=p_organization_id
    AND id=p_actor_member_id AND status='active';
  IF v_role NOT IN ('SUPERADMIN','ADMINISTRATOR','SALES_MANAGER')
    OR NOT public.native_sales_renewal_access(p_organization_id,p_actor_member_id,p_membership_id) THEN
    RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_request FROM public.sales_renewal_requests
    WHERE organization_id=p_organization_id AND membership_id=p_membership_id
      AND id=p_renewal_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'RENEWAL_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  IF v_request.status<>'PENDING' THEN
    RAISE EXCEPTION 'RENEWAL_ALREADY_REVIEWED' USING ERRCODE='22023';
  END IF;
  UPDATE public.sales_renewal_requests SET status=p_decision,reviewed_by=p_actor_member_id,
    reviewed_at=now(),decision_note=nullif(btrim(p_note),'')
    WHERE id=v_request.id RETURNING * INTO v_request;
  INSERT INTO public.sales_history
    (organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
    VALUES (p_organization_id,'membership',p_membership_id,p_actor_member_id,'renewal.reviewed',p_request_id,
      jsonb_build_object('renewalRequestId',v_request.id,'decision',p_decision));
  RETURN to_jsonb(v_request);
END;
$$;

REVOKE ALL ON FUNCTION public.native_sales_renewal_access(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.native_sales_list_renewal_requests(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.native_sales_request_renewal(uuid,uuid,uuid,text,text,text,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.native_sales_review_renewal(uuid,uuid,uuid,uuid,text,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_renewal_access(uuid,uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.native_sales_list_renewal_requests(uuid,uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.native_sales_request_renewal(uuid,uuid,uuid,text,text,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.native_sales_review_renewal(uuid,uuid,uuid,uuid,text,text,uuid) TO service_role;
