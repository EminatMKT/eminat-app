-- Scoped family review for an active EMC SALES_MANAGER. Seller denial remains unchanged.
-- Requires the previously deployed household-code version of the function.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='sales_family_requests'
      AND column_name='additional_fee_review')
    OR position('v_suffix' in pg_get_functiondef(
      'public.native_sales_review_family_member(uuid,uuid,uuid,uuid,text,uuid)'::regprocedure))=0 THEN
    RAISE EXCEPTION 'EMC_FAMILY_REVIEW_PRECHECK_FAILED';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.native_sales_review_family_member(
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
DECLARE v_suffix integer;
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
  IF NOT FOUND OR v_actor.role NOT IN ('SUPERADMIN','ADMINISTRATOR','SALES_MANAGER') THEN
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
  -- EMC managers may review requests only for their assigned EMC team.
  IF v_actor.role='SALES_MANAGER' AND (
    p_organization_id <> '9efab353-46a0-43d1-9901-e3f185dc5d30'::uuid
    OR NOT EXISTS (
      SELECT 1 FROM public.sales_team_members tm
      WHERE tm.organization_id=p_organization_id
        AND tm.member_id=p_actor_member_id
        AND tm.team_id=v_membership.team_id
    )
  ) THEN
    RAISE EXCEPTION 'FAMILY_APPROVAL_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  IF v_request.status<>'PENDING' THEN
    RAISE EXCEPTION 'FAMILY_REQUEST_ALREADY_REVIEWED' USING ERRCODE='23505';
  END IF;
  IF p_decision='REJECTED' THEN
    UPDATE public.sales_family_requests SET status='REJECTED',reviewed_by=p_actor_member_id,
      reviewed_at=now(),updated_at=now() WHERE id=v_request.id;
  ELSE
    IF v_request.additional_fee_review THEN
      RAISE EXCEPTION 'ADDITIONAL_MEMBER_PRICE_NOT_CONFIGURED' USING ERRCODE='22023';
    END IF;
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
    SELECT coalesce(max(ascii(right(h.member_code,1))-64),1)+1 INTO v_suffix
      FROM public.sales_household_members h
      WHERE h.organization_id=p_organization_id AND h.membership_id=p_membership_id
        AND h.member_code IS NOT NULL;
    IF v_suffix>26 THEN RAISE EXCEPTION 'HOUSEHOLD_CODE_EXHAUSTED' USING ERRCODE='22023'; END IF;
    v_code:=v_membership.code||' '||chr(64+v_suffix);
    v_code_number:=NULL;
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

REVOKE ALL ON FUNCTION public.native_sales_review_family_member(uuid,uuid,uuid,uuid,text,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_review_family_member(uuid,uuid,uuid,uuid,text,uuid)
  TO service_role;
