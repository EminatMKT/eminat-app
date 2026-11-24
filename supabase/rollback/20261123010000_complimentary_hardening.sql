BEGIN;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.sales_complimentary_custom_requests) OR EXISTS(SELECT 1 FROM public.sales_complimentary_events WHERE action='REACTIVATE') OR EXISTS(SELECT 1 FROM public.sales_contacts WHERE preferred_language IS NOT NULL) THEN RAISE EXCEPTION 'HARDENING_HISTORY_REQUIRES_FORWARD_REPAIR'; END IF;
END $$;
CREATE OR REPLACE FUNCTION public.native_sales_complimentary_activate(p_id uuid,p_contact uuid,p_auth uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE b public.sales_complimentary_benefits%ROWTYPE;c public.sales_contacts%ROWTYPE;q record;
DECLARE mid uuid:=gen_random_uuid();code_value text;code_num bigint;starts date;ends date;term text;
BEGIN
 SELECT * INTO b FROM public.sales_complimentary_benefits WHERE id=p_id FOR UPDATE;
 IF b.status<>'PENDING' OR b.membership_id IS NOT NULL OR b.valid_from>now() OR b.redeem_before<=now() THEN RAISE EXCEPTION 'COMPLIMENTARY_CODE_UNAVAILABLE'; END IF;
 SELECT * INTO c FROM public.sales_contacts WHERE organization_id=b.organization_id AND id=p_contact AND archived_at IS NULL FOR UPDATE;
 IF NOT FOUND OR (b.beneficiary_contact_id IS NOT NULL AND b.beneficiary_contact_id<>p_contact) THEN RAISE EXCEPTION 'COMPLIMENTARY_CODE_UNAVAILABLE'; END IF;
 -- Shared contact lock serializes different codes for the same beneficiary.
 IF EXISTS(SELECT 1 FROM public.sales_memberships WHERE organization_id=b.organization_id AND primary_contact_id=c.id AND status IN ('ACTIVE','PENDING') AND expires_at>=(now() AT TIME ZONE b.timezone)::date)
 OR EXISTS(SELECT 1 FROM public.sales_household_members h JOIN public.sales_memberships m ON m.organization_id=h.organization_id AND m.id=h.membership_id
 WHERE h.organization_id=b.organization_id AND h.contact_id=c.id AND h.status='ACTIVE' AND m.status='ACTIVE' AND m.expires_at>=(now() AT TIME ZONE b.timezone)::date)
 OR EXISTS(SELECT 1 FROM public.sales_patient_enrollment_intents i JOIN public.sales_patient_identities pi ON pi.id=i.patient_identity_id AND pi.organization_id=i.organization_id
 WHERE i.organization_id=b.organization_id AND pi.contact_id=c.id AND i.status NOT IN ('CANCELLED','FULFILLED')) THEN
 RAISE EXCEPTION 'COMPLIMENTARY_ACCOUNT_REVIEW_REQUIRED'; END IF;
 starts:=(now() AT TIME ZONE b.timezone)::date;
 ends:=public.native_sales_add_membership_months(starts,b.duration_months);
 term:=CASE WHEN b.duration_months IN (3,6,12) THEN b.duration_months::text||'M' ELSE 'CUSTOM' END;
 SELECT * INTO q FROM public.native_sales_membership_quote(b.plan,'INDIVIDUAL',CASE WHEN term='CUSTOM' THEN '12M' ELSE term END);
 SELECT allocated_code_number,allocated_code INTO code_num,code_value FROM public.native_sales_next_membership_code();
 -- Deferred FK allows one transaction to bind both the authorization and canonical membership.
 UPDATE public.sales_complimentary_benefits SET membership_id=mid,beneficiary_contact_id=c.id,status='ACTIVE',
 activated_at=now(),expires_at=ends::timestamp AT TIME ZONE b.timezone,
 redeemed_at=CASE WHEN p_auth IS NOT NULL THEN now() END,redeemed_by=p_auth,updated_at=now() WHERE id=b.id;
 INSERT INTO public.sales_memberships(id,organization_id,code,code_number,primary_contact_id,first_name,last_name,phone,email,address,
 membership_type,plan,duration,monthly_price_cents,total_price_cents,visit_fee_cents,included_visits,issued_at,expires_at,status,seller_member_id,
 sale_date,amount,created_by,funding_type,complimentary_benefit_id)
 VALUES(mid,b.organization_id,code_value,code_num,c.id,c.first_name,c.last_name,c.phone,c.email,c.address::text,
 'INDIVIDUAL',b.plan,term,0,0,q.visit_fee_cents,q.included_visits,starts,ends-1,'ACTIVE',b.authorized_by,starts,0,b.authorized_by,'COMPLIMENTARY',b.id);
 INSERT INTO public.sales_membership_code_registry(code,code_number,organization_id,membership_id) VALUES(code_value,code_num,b.organization_id,mid);
 INSERT INTO public.sales_membership_periods(organization_id,membership_id,starts_at,expires_at,plan,duration,amount_cents) VALUES(b.organization_id,mid,starts,ends-1,b.plan,term,0);
 INSERT INTO public.sales_household_members(organization_id,membership_id,contact_id,relationship,status,member_index,approved_by,approved_at)
 VALUES(b.organization_id,mid,c.id,'PRIMARY','ACTIVE',1,b.authorized_by,now());
 INSERT INTO public.sales_complimentary_events(organization_id,benefit_id,actor_member_id,actor_auth_id,action,changes)
 VALUES(b.organization_id,b.id,CASE WHEN p_auth IS NULL THEN b.authorized_by END,p_auth,'ACTIVATED',jsonb_build_object('membershipId',mid,'expiresAt',ends,'paymentRequirement','WAIVED'));
 RETURN jsonb_build_object('membershipId',mid,'plan',b.plan,'durationMonths',b.duration_months,'status','ACTIVE','expiresAt',ends,'fundingType','COMPLIMENTARY');
END $$;

CREATE OR REPLACE FUNCTION public.native_sales_complimentary_issue(p_org uuid,p_actor uuid,p_key uuid,p_hash text,p_plan text,p_months integer,
 p_reason text,p_contact uuid,p_campaign text,p_method text,p_code_hash text,p_valid_from timestamptz,p_redeem_before timestamptz) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r text;b public.sales_complimentary_benefits%ROWTYPE;tz text;existing public.sales_complimentary_benefits%ROWTYPE;
BEGIN
 r:=public.native_sales_complimentary_admin(p_org,p_actor);
 SELECT timezone INTO tz FROM public.sales_complimentary_settings WHERE organization_id=p_org AND enabled FOR SHARE;
 IF tz IS NULL OR NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=tz) THEN RAISE EXCEPTION 'COMPLIMENTARY_NOT_ENABLED'; END IF;
 IF p_code_hash IS NULL OR p_code_hash !~ '^[a-f0-9]{64}$' OR p_key IS NULL OR p_hash IS NULL OR p_hash !~ '^[a-f0-9]{64}$' OR p_plan IS NULL OR p_months IS NULL OR p_reason IS NULL
 OR p_method IS NULL OR p_method NOT IN ('ADMIN_DIRECT','REDEMPTION_CODE') OR (p_method='ADMIN_DIRECT' AND p_contact IS NULL)
 OR p_valid_from IS NULL OR p_redeem_before IS NULL OR p_redeem_before<=now() THEN RAISE EXCEPTION 'COMPLIMENTARY_INVALID_REQUEST'; END IF;
 IF p_months NOT IN (3,6,12) AND r<>'SUPERADMIN' THEN RAISE EXCEPTION 'COMPLIMENTARY_CUSTOM_FORBIDDEN' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_org::text||p_key::text,0));
 SELECT * INTO existing FROM public.sales_complimentary_benefits WHERE organization_id=p_org AND request_key=p_key;
 IF FOUND THEN
 IF existing.payload_hash<>p_hash THEN RAISE EXCEPTION 'COMPLIMENTARY_REQUEST_CONFLICT'; END IF;
 RETURN jsonb_build_object('id',existing.id,'membershipId',existing.membership_id,'replayed',true); END IF;
 IF p_contact IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.sales_contacts WHERE organization_id=p_org AND id=p_contact AND archived_at IS NULL) THEN RAISE EXCEPTION 'COMPLIMENTARY_ACCOUNT_REVIEW_REQUIRED'; END IF;
 INSERT INTO public.sales_complimentary_benefits(organization_id,plan,duration_months,reason,campaign,beneficiary_contact_id,activation_method,
 authorized_by,timezone,code_hash,valid_from,redeem_before,request_key,payload_hash)
 VALUES(p_org,p_plan,p_months,btrim(p_reason),p_campaign,p_contact,p_method,p_actor,tz,p_code_hash,p_valid_from,p_redeem_before,p_key,p_hash) RETURNING * INTO b;
 INSERT INTO public.sales_complimentary_events(organization_id,benefit_id,actor_member_id,action,reason) VALUES(p_org,b.id,p_actor,'AUTHORIZED',p_reason);
 IF p_method='ADMIN_DIRECT' THEN RETURN public.native_sales_complimentary_activate(b.id,p_contact)||jsonb_build_object('id',b.id); END IF;
 RETURN jsonb_build_object('id',b.id,'status','PENDING','replayed',false);
END $$;

CREATE OR REPLACE FUNCTION public.native_sales_complimentary_action(p_org uuid,p_actor uuid,p_id uuid,p_action text,p_months integer,p_reason text,p_key uuid DEFAULT gen_random_uuid()) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r text;b public.sales_complimentary_benefits%ROWTYPE;ends date;prior public.sales_complimentary_events%ROWTYPE;fingerprint text;
BEGIN
 r:=public.native_sales_complimentary_admin(p_org,p_actor);
 IF p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'COMPLIMENTARY_INVALID_REQUEST'; END IF;
 SELECT * INTO b FROM public.sales_complimentary_benefits WHERE organization_id=p_org AND id=p_id FOR UPDATE;
 IF NOT FOUND OR p_key IS NULL THEN RAISE EXCEPTION 'COMPLIMENTARY_STATE_CONFLICT'; END IF;
 fingerprint:=md5(jsonb_build_array(p_id,p_action,p_months,p_reason)::text);
 SELECT * INTO prior FROM public.sales_complimentary_events WHERE organization_id=p_org AND operation_key=p_key;
 IF FOUND THEN
 IF prior.benefit_id<>p_id OR prior.payload_hash<>fingerprint THEN RAISE EXCEPTION 'COMPLIMENTARY_REQUEST_CONFLICT'; END IF;
 RETURN jsonb_build_object('id',b.id,'action',p_action,'replayed',true); END IF;
 IF b.status='REVOKED' THEN RAISE EXCEPTION 'COMPLIMENTARY_STATE_CONFLICT'; END IF;
 IF p_action='EXTEND' THEN
 IF b.status NOT IN ('ACTIVE','SUSPENDED') OR b.expires_at<=now() OR p_months IS NULL OR p_months NOT BETWEEN 1 AND 120 OR b.duration_months+p_months>120 THEN RAISE EXCEPTION 'COMPLIMENTARY_STATE_CONFLICT'; END IF;
 IF p_months NOT IN (3,6,12) AND r<>'SUPERADMIN' THEN RAISE EXCEPTION 'COMPLIMENTARY_CUSTOM_FORBIDDEN'; END IF;
 ends:=public.native_sales_add_membership_months((b.expires_at AT TIME ZONE b.timezone)::date,p_months);
 UPDATE public.sales_complimentary_benefits SET expires_at=ends::timestamp AT TIME ZONE b.timezone,duration_months=duration_months+p_months,updated_at=now() WHERE id=b.id;
 UPDATE public.sales_memberships SET expires_at=ends-1,updated_at=now(),version=version+1 WHERE organization_id=p_org AND id=b.membership_id;
 INSERT INTO public.sales_membership_periods(organization_id,membership_id,starts_at,expires_at,plan,duration,amount_cents)
 VALUES(p_org,b.membership_id,(b.expires_at AT TIME ZONE b.timezone)::date,ends-1,b.plan,CASE WHEN p_months IN (3,6,12) THEN p_months::text||'M' ELSE 'CUSTOM' END,0);
 ELSIF p_action IN ('SUSPEND','REVOKE') THEN
 IF p_action='SUSPEND' AND b.status<>'ACTIVE' THEN RAISE EXCEPTION 'COMPLIMENTARY_STATE_CONFLICT'; END IF;
 UPDATE public.sales_complimentary_benefits SET status=CASE WHEN p_action='SUSPEND' THEN 'SUSPENDED' ELSE 'REVOKED' END,updated_at=now() WHERE id=b.id;
 UPDATE public.sales_memberships SET status='CANCELLED',updated_at=now(),version=version+1 WHERE organization_id=p_org AND id=b.membership_id;
 ELSE RAISE EXCEPTION 'COMPLIMENTARY_INVALID_REQUEST'; END IF;
 INSERT INTO public.sales_complimentary_events(organization_id,benefit_id,actor_member_id,action,reason,operation_key,payload_hash,changes)
 VALUES(p_org,b.id,p_actor,p_action,p_reason,p_key,fingerprint,jsonb_build_object('previousStatus',b.status,'previousExpiresAt',b.expires_at,'extensionMonths',p_months));
 RETURN jsonb_build_object('id',b.id,'action',p_action);
END $$;

CREATE OR REPLACE FUNCTION public.native_sales_complimentary_due(p_org uuid) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE expired_benefit public.sales_complimentary_benefits%ROWTYPE;rows jsonb;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'COMPLIMENTARY_FORBIDDEN'; END IF;
 FOR expired_benefit IN SELECT * FROM public.sales_complimentary_benefits WHERE organization_id=p_org AND status='ACTIVE' AND expires_at<=now() FOR UPDATE SKIP LOCKED LOOP
 UPDATE public.sales_complimentary_benefits SET status='EXPIRED',updated_at=now() WHERE id=expired_benefit.id;
 UPDATE public.sales_memberships SET status='EXPIRED',updated_at=now(),version=version+1 WHERE organization_id=p_org AND id=expired_benefit.membership_id;
 INSERT INTO public.sales_complimentary_events(organization_id,benefit_id,action) VALUES(p_org,expired_benefit.id,'EXPIRED');
 END LOOP;
 SELECT coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) INTO rows FROM (
 SELECT b.id,b.plan,b.expires_at,b.timezone,c.email,
 (b.expires_at AT TIME ZONE b.timezone)::date-(now() AT TIME ZONE b.timezone)::date AS days
 FROM public.sales_complimentary_benefits b JOIN public.sales_complimentary_settings s ON s.organization_id=b.organization_id AND s.enabled
 JOIN public.sales_contacts c ON c.organization_id=b.organization_id AND c.id=b.beneficiary_contact_id
 WHERE b.organization_id=p_org AND b.status='ACTIVE' AND b.expires_at>now() AND NOT c.do_not_email AND c.archived_at IS NULL AND c.email IS NOT NULL
 AND ((b.expires_at AT TIME ZONE b.timezone)::date-(now() AT TIME ZONE b.timezone)::date)=ANY(s.notification_days)
 AND NOT EXISTS(SELECT 1 FROM public.sales_patient_email_outbox mail WHERE mail.kind='activation' AND mail.event_id=b.id::text||'-'||extract(epoch FROM b.expires_at)::bigint::text||'-'||((b.expires_at AT TIME ZONE b.timezone)::date-(now() AT TIME ZONE b.timezone)::date)::text)
 ORDER BY b.id LIMIT 200) q;
 RETURN rows;
END $$;
DROP FUNCTION public.native_sales_complimentary_custom_request(uuid,uuid,uuid,text,integer,date,text,uuid);
DROP TABLE public.sales_complimentary_custom_request_events,public.sales_complimentary_custom_requests;
DROP FUNCTION public.native_sales_patient_language(uuid,text);
ALTER TABLE public.sales_contacts DROP COLUMN preferred_language;
ALTER TABLE public.sales_complimentary_benefits DROP COLUMN custom_policy_required;
COMMIT;
