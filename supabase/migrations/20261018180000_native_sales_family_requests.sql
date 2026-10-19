-- Family dependants occupy included capacity only after staff approval.
-- They share the paid primary membership; approval creates no payment.
CREATE FUNCTION public.native_sales_family_access(
  p_organization_id uuid,p_actor_member_id uuid,p_membership_id uuid
) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  SELECT m.role INTO v_role FROM public.sales_members m
    JOIN public.sales_organizations o ON o.id=m.organization_id
    WHERE m.organization_id=p_organization_id AND m.id=p_actor_member_id
      AND m.status='active' AND o.status='active';
  IF v_role IS NULL OR v_role='FINANCE' THEN RETURN false; END IF;
  RETURN EXISTS (SELECT 1 FROM public.sales_memberships sm
    WHERE sm.organization_id=p_organization_id AND sm.id=p_membership_id
      AND (v_role IN ('SUPERADMIN','ADMINISTRATOR','AUDITOR')
        OR sm.seller_member_id=p_actor_member_id
        OR (v_role='SALES_MANAGER' AND EXISTS (
          SELECT 1 FROM public.sales_team_members tm
          WHERE tm.organization_id=p_organization_id AND tm.member_id=p_actor_member_id
            AND tm.team_id=sm.team_id))));
END;
$$;

CREATE FUNCTION public.native_sales_request_family_member(
  p_organization_id uuid,p_actor_member_id uuid,p_membership_id uuid,
  p_contact_id uuid,p_relationship text,p_idempotency_key text,p_request_id uuid
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_actor public.sales_members%ROWTYPE;
DECLARE v_membership public.sales_memberships%ROWTYPE;
DECLARE v_contact public.sales_contacts%ROWTYPE;
DECLARE v_existing public.sales_family_requests%ROWTYPE;
DECLARE v_issued integer;
DECLARE v_pending integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  IF p_membership_id IS NULL OR p_contact_id IS NULL OR p_request_id IS NULL
    OR p_relationship IS NULL OR p_relationship NOT IN ('SPOUSE','CHILD','PARENT','OTHER')
    OR p_idempotency_key IS NULL OR p_idempotency_key !~ '^[A-Za-z0-9_-]{8,128}$' THEN
    RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE='22023';
  END IF;
  SELECT m.* INTO v_actor FROM public.sales_members m
    JOIN public.sales_organizations o ON o.id=m.organization_id
    WHERE m.organization_id=p_organization_id AND m.id=p_actor_member_id
      AND m.status='active' AND o.status='active';
  IF NOT FOUND OR v_actor.role NOT IN ('SELLER','SALES_MANAGER','ADMINISTRATOR','SUPERADMIN') THEN
    RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_membership FROM public.sales_memberships
    WHERE organization_id=p_organization_id AND id=p_membership_id FOR UPDATE;
  IF NOT FOUND OR NOT public.native_sales_family_access(p_organization_id,p_actor_member_id,p_membership_id)
    OR v_membership.membership_type<>'FAMILY' OR v_membership.is_demo
    OR v_membership.status<>'ACTIVE' OR v_membership.expires_at<current_date
    OR v_membership.sales_payment_id IS NULL OR v_membership.payment_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'FAMILY_MEMBERSHIP_NOT_ELIGIBLE' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_contact FROM public.sales_contacts
    WHERE organization_id=p_organization_id AND id=p_contact_id AND archived_at IS NULL;
  IF NOT FOUND OR p_contact_id=v_membership.primary_contact_id
    OR NOT EXISTS (SELECT 1 FROM public.native_sales_visible_crm(
      p_organization_id,p_actor_member_id,'contacts',1,0,NULL,p_contact_id)) THEN
    RAISE EXCEPTION 'CONTACT_NOT_FOUND' USING ERRCODE='P0002';
  END IF;
  IF nullif(btrim(v_contact.first_name),'') IS NULL OR nullif(btrim(v_contact.last_name),'') IS NULL
    OR v_contact.phone IS NULL OR v_contact.phone !~ '^\+[1-9][0-9]{7,14}$'
    OR v_contact.date_of_birth IS NULL
    OR nullif(btrim(concat_ws(', ',v_contact.address->>'street',v_contact.address->>'city',
      v_contact.address->>'state',v_contact.address->>'postalCode',v_contact.address->>'country')),'') IS NULL THEN
    RAISE EXCEPTION 'DEPENDENT_CONTACT_DETAILS_REQUIRED' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_existing FROM public.sales_family_requests
    WHERE organization_id=p_organization_id AND idempotency_key=p_idempotency_key;
  IF FOUND THEN
    IF v_existing.membership_id<>p_membership_id OR v_existing.requested_contact_id<>p_contact_id
      OR v_existing.relationship<>p_relationship THEN
      RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE='23505';
    END IF;
    RETURN jsonb_build_object('id',v_existing.id,'status',v_existing.status,'replayed',true);
  END IF;
  SELECT * INTO v_existing FROM public.sales_family_requests
    WHERE organization_id=p_organization_id AND membership_id=p_membership_id
      AND requested_contact_id=p_contact_id AND status='PENDING';
  IF FOUND THEN
    RETURN jsonb_build_object('id',v_existing.id,'status',v_existing.status,'replayed',true);
  END IF;
  IF EXISTS (SELECT 1 FROM public.sales_memberships m
    WHERE m.organization_id=p_organization_id AND m.primary_contact_id=p_contact_id
      AND m.status='ACTIVE' AND m.expires_at>=current_date)
    OR EXISTS (SELECT 1 FROM public.sales_household_members h
      JOIN public.sales_memberships m ON m.organization_id=h.organization_id AND m.id=h.membership_id
      WHERE h.organization_id=p_organization_id AND h.contact_id=p_contact_id
        AND h.status='ACTIVE' AND m.status='ACTIVE' AND m.expires_at>=current_date) THEN
    RAISE EXCEPTION 'DEPENDENT_ALREADY_HAS_MEMBERSHIP' USING ERRCODE='22023';
  END IF;
  SELECT count(*) INTO v_issued FROM public.sales_household_members
    WHERE organization_id=p_organization_id AND membership_id=p_membership_id AND status='ACTIVE';
  SELECT count(*) INTO v_pending FROM public.sales_family_requests
    WHERE organization_id=p_organization_id AND membership_id=p_membership_id AND status='PENDING';
  IF v_issued+v_pending>=3 THEN
    RAISE EXCEPTION 'HOUSEHOLD_LIMIT_REACHED' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.sales_family_requests
    (organization_id,membership_id,requested_by,requested_contact_id,first_name,last_name,
     date_of_birth,relationship,status,idempotency_key)
    VALUES (p_organization_id,p_membership_id,p_actor_member_id,p_contact_id,
      btrim(v_contact.first_name),btrim(v_contact.last_name),v_contact.date_of_birth,
      p_relationship,'PENDING',p_idempotency_key) RETURNING * INTO v_existing;
  INSERT INTO public.sales_history
    (organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
    VALUES (p_organization_id,'family_request',v_existing.id,p_actor_member_id,'requested',p_request_id,
      jsonb_build_object('membershipId',p_membership_id,'contactId',p_contact_id,
        'relationship',p_relationship));
  RETURN jsonb_build_object('id',v_existing.id,'status','PENDING','replayed',false);
END;
$$;

CREATE FUNCTION public.native_sales_review_family_member(
  p_organization_id uuid,p_actor_member_id uuid,p_membership_id uuid,
  p_family_request_id uuid,p_decision text,p_request_id uuid
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_actor public.sales_members%ROWTYPE;
DECLARE v_membership public.sales_memberships%ROWTYPE;
DECLARE v_request public.sales_family_requests%ROWTYPE;
DECLARE v_contact public.sales_contacts%ROWTYPE;
DECLARE v_slot integer;
DECLARE v_household_id uuid;
DECLARE v_code_number bigint;
DECLARE v_code text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  IF p_membership_id IS NULL OR p_family_request_id IS NULL OR p_request_id IS NULL
    OR p_decision IS NULL OR p_decision NOT IN ('APPROVED','REJECTED') THEN
    RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE='22023';
  END IF;
  SELECT m.* INTO v_actor FROM public.sales_members m
    JOIN public.sales_organizations o ON o.id=m.organization_id
    WHERE m.organization_id=p_organization_id AND m.id=p_actor_member_id
      AND m.status='active' AND o.status='active';
  IF NOT FOUND OR v_actor.role NOT IN ('SUPERADMIN','ADMINISTRATOR') THEN
    RAISE EXCEPTION 'FAMILY_APPROVAL_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_membership FROM public.sales_memberships
    WHERE organization_id=p_organization_id AND id=p_membership_id FOR UPDATE;
  IF NOT FOUND OR v_membership.membership_type<>'FAMILY' OR v_membership.is_demo
    OR v_membership.status<>'ACTIVE' OR v_membership.expires_at<current_date
    OR v_membership.sales_payment_id IS NULL OR v_membership.payment_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'FAMILY_MEMBERSHIP_NOT_ELIGIBLE' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_request FROM public.sales_family_requests
    WHERE organization_id=p_organization_id AND membership_id=p_membership_id
      AND id=p_family_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FAMILY_REQUEST_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  IF v_request.status<>'PENDING' THEN
    RAISE EXCEPTION 'FAMILY_REQUEST_ALREADY_REVIEWED' USING ERRCODE='23505';
  END IF;
  IF p_decision='REJECTED' THEN
    UPDATE public.sales_family_requests SET status='REJECTED',reviewed_by=p_actor_member_id,
      reviewed_at=now(),updated_at=now() WHERE id=v_request.id;
  ELSE
    SELECT * INTO v_contact FROM public.sales_contacts
      WHERE organization_id=p_organization_id AND id=v_request.requested_contact_id AND archived_at IS NULL;
    IF NOT FOUND OR nullif(btrim(v_contact.first_name),'') IS NULL
      OR nullif(btrim(v_contact.last_name),'') IS NULL OR v_contact.phone IS NULL
      OR v_contact.phone !~ '^\+[1-9][0-9]{7,14}$'
      OR v_contact.date_of_birth IS NULL
      OR nullif(btrim(concat_ws(', ',v_contact.address->>'street',v_contact.address->>'city',
        v_contact.address->>'state',v_contact.address->>'postalCode',v_contact.address->>'country')),'') IS NULL THEN
      RAISE EXCEPTION 'DEPENDENT_CONTACT_DETAILS_REQUIRED' USING ERRCODE='22023';
    END IF;
    IF EXISTS (SELECT 1 FROM public.sales_memberships m
      WHERE m.organization_id=p_organization_id AND m.primary_contact_id=v_contact.id
        AND m.status='ACTIVE' AND m.expires_at>=current_date)
      OR EXISTS (SELECT 1 FROM public.sales_household_members h
        JOIN public.sales_memberships m ON m.organization_id=h.organization_id AND m.id=h.membership_id
        WHERE h.organization_id=p_organization_id AND h.contact_id=v_contact.id
          AND h.status='ACTIVE' AND m.status='ACTIVE' AND m.expires_at>=current_date) THEN
      RAISE EXCEPTION 'DEPENDENT_ALREADY_HAS_MEMBERSHIP' USING ERRCODE='22023';
    END IF;
    SELECT candidate INTO v_slot FROM generate_series(2,3) candidate
      WHERE NOT EXISTS (SELECT 1 FROM public.sales_household_members h
        WHERE h.organization_id=p_organization_id AND h.membership_id=p_membership_id
          AND h.member_index=candidate AND h.status='ACTIVE') ORDER BY candidate LIMIT 1;
    IF v_slot IS NULL THEN RAISE EXCEPTION 'HOUSEHOLD_LIMIT_REACHED' USING ERRCODE='22023'; END IF;
    SELECT next_code.allocated_code_number,next_code.allocated_code INTO v_code_number,v_code
      FROM public.native_sales_next_membership_code() AS next_code;
    INSERT INTO public.sales_household_members
      (organization_id,membership_id,contact_id,relationship,status,member_index,
       approved_by,approved_at,code,code_number)
      VALUES (p_organization_id,p_membership_id,v_contact.id,v_request.relationship,'ACTIVE',v_slot,
        p_actor_member_id,now(),v_code,v_code_number) RETURNING id INTO v_household_id;
    INSERT INTO public.sales_membership_code_registry
      (code,code_number,organization_id,household_member_id)
      VALUES (v_code,v_code_number,p_organization_id,v_household_id);
    UPDATE public.sales_family_requests SET status='APPROVED',reviewed_by=p_actor_member_id,
      reviewed_at=now(),issued_household_member_id=v_household_id,updated_at=now()
      WHERE id=v_request.id;
  END IF;
  INSERT INTO public.sales_history
    (organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
    VALUES (p_organization_id,'family_request',v_request.id,p_actor_member_id,
      lower(p_decision),p_request_id,
      jsonb_build_object('membershipId',p_membership_id,'householdMemberId',v_household_id,
        'amountCents',0));
  RETURN jsonb_build_object('id',v_request.id,'status',p_decision,
    'householdMemberId',v_household_id,'code',v_code);
END;
$$;

CREATE FUNCTION public.native_sales_list_family_requests(
  p_organization_id uuid,p_actor_member_id uuid,p_membership_id uuid
) RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  IF NOT public.native_sales_family_access(p_organization_id,p_actor_member_id,p_membership_id) THEN
    RAISE EXCEPTION 'FAMILY_MEMBERSHIP_NOT_FOUND' USING ERRCODE='P0002';
  END IF;
  RETURN QUERY SELECT jsonb_build_object(
    'id',r.id,'status',r.status,'relationship',r.relationship,
    'dependentContactId',r.requested_contact_id,
    'dependentName',c.display_name,'requestedBy',r.requested_by,
    'reviewedBy',r.reviewed_by,'createdAt',r.created_at,
    'reviewedAt',r.reviewed_at,'householdMemberId',r.issued_household_member_id,
    'code',h.code)
    FROM public.sales_family_requests r
    LEFT JOIN public.sales_contacts c ON c.organization_id=r.organization_id
      AND c.id=r.requested_contact_id
    LEFT JOIN public.sales_household_members h ON h.organization_id=r.organization_id
      AND h.id=r.issued_household_member_id
    WHERE r.organization_id=p_organization_id AND r.membership_id=p_membership_id
    ORDER BY r.created_at DESC,r.id DESC LIMIT 100;
END;
$$;

REVOKE ALL ON FUNCTION public.native_sales_family_access(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.native_sales_request_family_member(uuid,uuid,uuid,uuid,text,text,uuid)
  FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.native_sales_review_family_member(uuid,uuid,uuid,uuid,text,uuid)
  FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.native_sales_list_family_requests(uuid,uuid,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_family_access(uuid,uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.native_sales_request_family_member(uuid,uuid,uuid,uuid,text,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.native_sales_review_family_member(uuid,uuid,uuid,uuid,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.native_sales_list_family_requests(uuid,uuid,uuid) TO service_role;
