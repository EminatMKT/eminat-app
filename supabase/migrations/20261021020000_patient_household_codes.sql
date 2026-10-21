-- Future family members share the paid primary root code. Historical issued codes are unchanged.
ALTER TABLE public.sales_household_members ADD COLUMN member_code text;
CREATE UNIQUE INDEX sales_household_member_code_unique
  ON public.sales_household_members(member_code) WHERE member_code IS NOT NULL;
CREATE FUNCTION public.native_sales_household_assign_member_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_root text;
BEGIN
  SELECT code INTO v_root FROM public.sales_memberships
    WHERE organization_id=NEW.organization_id AND id=NEW.membership_id;
  IF v_root IS NULL OR NEW.member_index NOT BETWEEN 1 AND 3 THEN
    RAISE EXCEPTION 'HOUSEHOLD_CODE_INVALID' USING ERRCODE='22023';
  END IF;
  IF NEW.relationship='PRIMARY' THEN
    NEW.member_code:=v_root||' A';
  ELSIF NEW.code IS NOT NULL AND left(NEW.code,length(v_root)+1)=v_root||' '
    AND substr(NEW.code,length(v_root)+2) ~ '^[B-Z]$' THEN
    NEW.member_code:=NEW.code;
  ELSE
    RAISE EXCEPTION 'HOUSEHOLD_CODE_INVALID' USING ERRCODE='22023';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER sales_household_assign_member_code_before_insert
  BEFORE INSERT ON public.sales_household_members FOR EACH ROW
  EXECUTE FUNCTION public.native_sales_household_assign_member_code();
REVOKE ALL ON FUNCTION public.native_sales_household_assign_member_code()
  FROM PUBLIC,anon,authenticated;

ALTER TABLE public.sales_family_requests ADD COLUMN patient_identity_id uuid;
ALTER TABLE public.sales_family_requests ADD COLUMN additional_fee_review boolean NOT NULL DEFAULT false;
ALTER TABLE public.sales_family_requests ADD CONSTRAINT sales_family_requests_patient_identity_fk
  FOREIGN KEY (organization_id,patient_identity_id)
  REFERENCES public.sales_patient_identities(organization_id,id) ON DELETE RESTRICT;
CREATE INDEX sales_family_requests_patient_idx
  ON public.sales_family_requests(organization_id,patient_identity_id,created_at DESC)
  WHERE patient_identity_id IS NOT NULL;
CREATE UNIQUE INDEX sales_family_requests_patient_pending_person
  ON public.sales_family_requests(organization_id,membership_id,
    lower(btrim(first_name)),lower(btrim(last_name)),date_of_birth,relationship)
  WHERE patient_identity_id IS NOT NULL AND status='PENDING';

CREATE FUNCTION public.native_sales_patient_family_request(
  p_identity_id uuid,p_owner_member_id uuid,p_first_name text,p_last_name text,
  p_date_of_birth date,p_relationship text,p_key uuid
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_identity public.sales_patient_identities%ROWTYPE;
DECLARE v_membership public.sales_memberships%ROWTYPE;
DECLARE v_existing public.sales_family_requests%ROWTYPE;
DECLARE v_request_id uuid;
DECLARE v_active integer;
DECLARE v_pending integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'PATIENT_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  IF p_identity_id IS NULL OR p_owner_member_id IS NULL OR p_key IS NULL
    OR p_first_name IS NULL OR length(btrim(p_first_name)) NOT BETWEEN 1 AND 80
    OR p_last_name IS NULL OR length(btrim(p_last_name)) NOT BETWEEN 1 AND 80
    OR p_relationship NOT IN ('SPOUSE','CHILD','PARENT','OTHER')
    OR p_date_of_birth IS NULL OR p_date_of_birth>current_date
    OR p_date_of_birth<date '1900-01-01' THEN
    RAISE EXCEPTION 'PATIENT_FAMILY_INVALID' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_identity FROM public.sales_patient_identities WHERE id=p_identity_id;
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM public.sales_members
    WHERE organization_id=v_identity.organization_id AND id=p_owner_member_id) THEN
    RAISE EXCEPTION 'PATIENT_FAMILY_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_membership FROM public.sales_memberships
    WHERE organization_id=v_identity.organization_id
      AND primary_contact_id=v_identity.contact_id AND status='ACTIVE'
      AND membership_type='FAMILY' AND is_demo=false
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND OR v_membership.expires_at<current_date
    OR v_membership.sales_payment_id IS NULL OR v_membership.payment_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'PATIENT_FAMILY_NOT_ELIGIBLE' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_existing FROM public.sales_family_requests
    WHERE organization_id=v_identity.organization_id AND patient_identity_id=p_identity_id
      AND idempotency_key=p_key::text;
  IF FOUND THEN RETURN jsonb_build_object('id',v_existing.id,'status',v_existing.status); END IF;
  SELECT count(*) INTO v_active FROM public.sales_household_members
    WHERE organization_id=v_identity.organization_id AND membership_id=v_membership.id
      AND status='ACTIVE';
  SELECT count(*) INTO v_pending FROM public.sales_family_requests
    WHERE organization_id=v_identity.organization_id AND membership_id=v_membership.id
      AND status='PENDING';
  INSERT INTO public.sales_family_requests
    (organization_id,membership_id,requested_by,patient_identity_id,
      first_name,last_name,date_of_birth,relationship,idempotency_key,additional_fee_review)
  VALUES (v_identity.organization_id,v_membership.id,p_owner_member_id,p_identity_id,
    btrim(p_first_name),btrim(p_last_name),p_date_of_birth,p_relationship,p_key::text,
    v_active+v_pending>=3)
  RETURNING id INTO v_request_id;
  RETURN jsonb_build_object('id',v_request_id,'status','PENDING',
    'additionalFeeReview',v_active+v_pending>=3);
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_patient_family_request(uuid,uuid,text,text,date,text,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_family_request(uuid,uuid,text,text,date,text,uuid)
  TO service_role;

-- A primary patient may remove a dependant from their own paid Family membership.
-- The historical member row and issued code remain for audit; removed codes are never reused.
CREATE FUNCTION public.native_sales_patient_remove_family_member(
  p_identity_id uuid,p_household_member_id uuid,p_owner_member_id uuid,p_request_id uuid
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_identity public.sales_patient_identities%ROWTYPE;
DECLARE v_membership public.sales_memberships%ROWTYPE;
DECLARE v_member public.sales_household_members%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'PATIENT_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  IF p_identity_id IS NULL OR p_household_member_id IS NULL OR p_owner_member_id IS NULL
    OR p_request_id IS NULL THEN
    RAISE EXCEPTION 'PATIENT_FAMILY_INVALID' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_identity FROM public.sales_patient_identities WHERE id=p_identity_id;
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM public.sales_members
    WHERE organization_id=v_identity.organization_id AND id=p_owner_member_id) THEN
    RAISE EXCEPTION 'PATIENT_FAMILY_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_membership FROM public.sales_memberships
    WHERE organization_id=v_identity.organization_id
      AND primary_contact_id=v_identity.contact_id AND status='ACTIVE'
      AND membership_type='FAMILY' AND is_demo=false
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND OR v_membership.expires_at<current_date
    OR v_membership.sales_payment_id IS NULL OR v_membership.payment_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'PATIENT_FAMILY_NOT_ELIGIBLE' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_member FROM public.sales_household_members
    WHERE organization_id=v_identity.organization_id AND membership_id=v_membership.id
      AND id=p_household_member_id FOR UPDATE;
  IF NOT FOUND OR v_member.relationship='PRIMARY' THEN
    RAISE EXCEPTION 'PATIENT_FAMILY_MEMBER_NOT_FOUND' USING ERRCODE='22023';
  END IF;
  IF v_member.status='REMOVED' THEN
    RETURN jsonb_build_object('id',v_member.id,'status','REMOVED','replayed',true);
  END IF;
  UPDATE public.sales_household_members SET status='REMOVED' WHERE id=v_member.id;
  INSERT INTO public.sales_history
    (organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
  VALUES (v_identity.organization_id,'household_member',v_member.id,p_owner_member_id,
    'patient_removed',p_request_id,
    jsonb_build_object('patientIdentityId',p_identity_id,'membershipId',v_membership.id,
      'memberCode',v_member.member_code));
  RETURN jsonb_build_object('id',v_member.id,'status','REMOVED','replayed',false);
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_patient_remove_family_member(uuid,uuid,uuid,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_remove_family_member(uuid,uuid,uuid,uuid)
  TO service_role;

-- Patient requests contain verified form input but no contact identity. A staff reviewer
-- explicitly links an existing, complete EMC contact after checking the person.
CREATE FUNCTION public.native_sales_patient_bind_family_contact(
  p_organization_id uuid,p_actor_member_id uuid,p_membership_id uuid,
  p_family_request_id uuid,p_contact_id uuid,p_request_id uuid
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_actor public.sales_members%ROWTYPE;
DECLARE v_request public.sales_family_requests%ROWTYPE;
DECLARE v_contact public.sales_contacts%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  IF p_request_id IS NULL OR p_contact_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_actor FROM public.sales_members
    WHERE organization_id=p_organization_id AND id=p_actor_member_id AND status='active';
  IF NOT FOUND OR v_actor.role NOT IN ('SUPERADMIN','ADMINISTRATOR') THEN
    RAISE EXCEPTION 'FAMILY_APPROVAL_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_request FROM public.sales_family_requests
    WHERE organization_id=p_organization_id AND membership_id=p_membership_id
      AND id=p_family_request_id AND patient_identity_id IS NOT NULL FOR UPDATE;
  IF NOT FOUND OR v_request.status<>'PENDING' THEN
    RAISE EXCEPTION 'PATIENT_FAMILY_REQUEST_NOT_PENDING' USING ERRCODE='22023';
  END IF;
  IF v_request.requested_contact_id IS NOT NULL THEN
    IF v_request.requested_contact_id=p_contact_id THEN
      RETURN jsonb_build_object('id',v_request.id,'contactId',p_contact_id,'replayed',true);
    END IF;
    RAISE EXCEPTION 'FAMILY_CONTACT_ALREADY_BOUND' USING ERRCODE='23505';
  END IF;
  SELECT * INTO v_contact FROM public.sales_contacts
    WHERE organization_id=p_organization_id AND id=p_contact_id AND archived_at IS NULL;
  IF NOT FOUND OR lower(btrim(v_contact.first_name)) IS DISTINCT FROM lower(btrim(v_request.first_name))
    OR lower(btrim(v_contact.last_name)) IS DISTINCT FROM lower(btrim(v_request.last_name))
    OR v_contact.date_of_birth IS DISTINCT FROM v_request.date_of_birth
    OR nullif(btrim(v_contact.phone),'') IS NULL
    OR v_contact.phone !~ '^\+[1-9][0-9]{7,14}$'
    OR nullif(btrim(concat_ws(', ',v_contact.address->>'street',v_contact.address->>'city',
      v_contact.address->>'state',v_contact.address->>'postalCode',v_contact.address->>'country')),'') IS NULL THEN
    RAISE EXCEPTION 'DEPENDENT_CONTACT_REVIEW_REQUIRED' USING ERRCODE='22023';
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
  UPDATE public.sales_family_requests SET requested_contact_id=p_contact_id,updated_at=now()
    WHERE id=v_request.id;
  INSERT INTO public.sales_history
    (organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
  VALUES (p_organization_id,'family_request',v_request.id,p_actor_member_id,
    'patient_contact_bound',p_request_id,jsonb_build_object('contactId',p_contact_id));
  RETURN jsonb_build_object('id',v_request.id,'contactId',p_contact_id,'replayed',false);
END;
$$;

CREATE OR REPLACE FUNCTION public.native_sales_list_family_requests(
  p_organization_id uuid,p_actor_member_id uuid,p_membership_id uuid
) RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
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
    'dependentName',coalesce(c.display_name,concat_ws(' ',r.first_name,r.last_name)),
    'patientSubmitted',r.patient_identity_id IS NOT NULL,
    'additionalFeeReview',r.additional_fee_review,
    'requestedBy',r.requested_by,'reviewedBy',r.reviewed_by,
    'createdAt',r.created_at,'reviewedAt',r.reviewed_at,
    'householdMemberId',r.issued_household_member_id,
    'code',coalesce(h.member_code,h.code))
  FROM public.sales_family_requests r
  LEFT JOIN public.sales_contacts c ON c.organization_id=r.organization_id
    AND c.id=r.requested_contact_id
  LEFT JOIN public.sales_household_members h ON h.organization_id=r.organization_id
    AND h.id=r.issued_household_member_id
  WHERE r.organization_id=p_organization_id AND r.membership_id=p_membership_id
  ORDER BY r.created_at DESC,r.id DESC LIMIT 100;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_patient_bind_family_contact(uuid,uuid,uuid,uuid,uuid,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_bind_family_contact(uuid,uuid,uuid,uuid,uuid,uuid)
  TO service_role;

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
