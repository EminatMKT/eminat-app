-- Additive authorized waivers; paid payment verification remains independently enforced.
BEGIN;
CREATE TABLE public.sales_complimentary_settings (
 organization_id uuid PRIMARY KEY REFERENCES public.sales_organizations(id),
 timezone text NOT NULL DEFAULT 'America/New_York',
 notification_days integer[] NOT NULL DEFAULT ARRAY[30,7,1],
 enabled boolean NOT NULL DEFAULT false
);
CREATE TABLE public.sales_complimentary_benefits (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.sales_organizations(id),
 plan text NOT NULL CHECK(plan IN ('ESSENTIAL','PLUS','MAX')),
 duration_months integer NOT NULL CHECK(duration_months BETWEEN 1 AND 120),
 reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 500),
 campaign text CHECK(length(btrim(campaign)) BETWEEN 1 AND 160),
 beneficiary_contact_id uuid, membership_id uuid,
 authorization_status text NOT NULL DEFAULT 'APPROVED' CHECK(authorization_status='APPROVED'),
 payment_requirement text NOT NULL DEFAULT 'WAIVED' CHECK(payment_requirement='WAIVED'),
 activation_method text NOT NULL CHECK(activation_method IN ('ADMIN_DIRECT','REDEMPTION_CODE')),
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','ACTIVE','SUSPENDED','REVOKED','EXPIRED')),
 authorized_by uuid NOT NULL, authorized_at timestamptz NOT NULL DEFAULT now(),
 timezone text NOT NULL, code_hash text UNIQUE CHECK(code_hash ~ '^[a-f0-9]{64}$'),
 valid_from timestamptz NOT NULL, redeem_before timestamptz NOT NULL,
 activated_at timestamptz, expires_at timestamptz, invitation_claimed_at timestamptz, redeemed_at timestamptz, redeemed_by uuid REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 request_key uuid NOT NULL, payload_hash text NOT NULL,
 CHECK((membership_id IS NULL AND activated_at IS NULL AND expires_at IS NULL AND status IN ('PENDING','REVOKED')) OR
 (membership_id IS NOT NULL AND beneficiary_contact_id IS NOT NULL AND activated_at IS NOT NULL AND expires_at IS NOT NULL AND expires_at>activated_at AND status IN ('ACTIVE','SUSPENDED','REVOKED','EXPIRED'))),
 CHECK(redeem_before>valid_from), CHECK(activation_method<>'REDEMPTION_CODE' OR code_hash IS NOT NULL),
 FOREIGN KEY(organization_id,beneficiary_contact_id) REFERENCES public.sales_contacts(organization_id,id),
 FOREIGN KEY(organization_id,authorized_by) REFERENCES public.sales_members(organization_id,id),
 FOREIGN KEY(organization_id,membership_id) REFERENCES public.sales_memberships(organization_id,id),
 UNIQUE(organization_id,id), UNIQUE(organization_id,request_key), UNIQUE(membership_id)
);
ALTER TABLE public.sales_memberships ADD COLUMN funding_type text NOT NULL DEFAULT 'PAID' CHECK(funding_type IN ('PAID','COMPLIMENTARY'));
ALTER TABLE public.sales_memberships ADD COLUMN complimentary_benefit_id uuid;
ALTER TABLE public.sales_memberships ADD CONSTRAINT sales_memberships_complimentary_fk
 FOREIGN KEY(organization_id,complimentary_benefit_id) REFERENCES public.sales_complimentary_benefits(organization_id,id);
ALTER TABLE public.sales_memberships ADD CONSTRAINT sales_memberships_funding_consistency CHECK(
 (funding_type='PAID' AND complimentary_benefit_id IS NULL) OR
 (funding_type='COMPLIMENTARY' AND complimentary_benefit_id IS NOT NULL AND sales_payment_id IS NULL
 AND opportunity_id IS NULL AND amount=0 AND monthly_price_cents=0 AND total_price_cents=0
 AND payment_confirmed_at IS NULL AND NOT is_demo AND legacy_annie_id IS NULL AND membership_type='INDIVIDUAL'));
-- Match the original payment-presence check by definition, failing closed on schema drift.
DO $$ DECLARE c record;n integer:=0; BEGIN
 FOR c IN SELECT conname,pg_get_constraintdef(oid) def FROM pg_constraint
 WHERE conrelid='public.sales_memberships'::regclass AND contype='c' LOOP
  IF c.def LIKE '%sales_payment_id IS NOT NULL%' AND c.def LIKE '%status%' THEN
   n:=n+1; EXECUTE format('ALTER TABLE public.sales_memberships DROP CONSTRAINT %I',c.conname);
   EXECUTE 'ALTER TABLE public.sales_memberships ADD CONSTRAINT sales_memberships_active_payment_or_waiver CHECK
    (status <> ''ACTIVE'' OR is_demo OR legacy_annie_id IS NOT NULL OR sales_payment_id IS NOT NULL
     OR (funding_type=''COMPLIMENTARY'' AND complimentary_benefit_id IS NOT NULL))';
  END IF;
 END LOOP;
 IF n<>1 THEN RAISE EXCEPTION 'COMPLIMENTARY_PAYMENT_CONSTRAINT_DRIFT'; END IF;
END $$;
-- CUSTOM is a term label only; authorized month count remains on the benefit.
DO $$ DECLARE t text;c record; BEGIN
 FOREACH t IN ARRAY ARRAY['sales_memberships','sales_membership_periods'] LOOP
  FOR c IN SELECT conname,pg_get_constraintdef(oid) def FROM pg_constraint
   WHERE conrelid=('public.'||t)::regclass AND contype='c' LOOP
   IF c.def LIKE '%duration = ANY%' AND c.def LIKE '%12M%' THEN
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I',t,c.conname);
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I %s',t,c.conname,
     replace(c.def,'''12M''::text','''12M''::text, ''CUSTOM''::text'));
   END IF;
  END LOOP;
 END LOOP;
END $$;
CREATE UNIQUE INDEX sales_memberships_one_benefit ON public.sales_memberships(complimentary_benefit_id) WHERE complimentary_benefit_id IS NOT NULL;
CREATE INDEX sales_complimentary_org_status ON public.sales_complimentary_benefits(organization_id,status,expires_at);
CREATE TABLE public.sales_complimentary_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, benefit_id uuid NOT NULL,
 actor_member_id uuid, actor_auth_id uuid REFERENCES auth.users(id), action text NOT NULL,
 reason text, operation_key uuid, payload_hash text, changes jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,operation_key),
 FOREIGN KEY(organization_id,benefit_id) REFERENCES public.sales_complimentary_benefits(organization_id,id),
 FOREIGN KEY(organization_id,actor_member_id) REFERENCES public.sales_members(organization_id,id)
);
CREATE TABLE public.sales_complimentary_attempts (
 subject_hash text PRIMARY KEY CHECK(subject_hash ~ '^[a-f0-9]{64}$'),
 window_start timestamptz NOT NULL DEFAULT now(), attempts integer NOT NULL DEFAULT 1
);
ALTER TABLE public.sales_complimentary_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_complimentary_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_complimentary_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_complimentary_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sales_complimentary_settings,public.sales_complimentary_benefits,public.sales_complimentary_events,public.sales_complimentary_attempts FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.sales_complimentary_settings,public.sales_complimentary_benefits,public.sales_complimentary_events TO service_role;

CREATE FUNCTION public.native_sales_complimentary_admin(p_org uuid,p_actor uuid) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r text;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'COMPLIMENTARY_FORBIDDEN' USING ERRCODE='42501'; END IF;
 SELECT m.role INTO r FROM public.sales_members m JOIN public.usuarios u ON u.id=m.user_id AND u.auth_id=m.auth_id
 JOIN public.sales_organizations o ON o.id=m.organization_id
 WHERE m.id=p_actor AND m.organization_id=p_org AND m.status='active' AND u.activo AND o.status='active'
 AND m.role IN ('ADMINISTRATOR','SUPERADMIN') FOR SHARE OF m,u,o;
 IF r IS NULL THEN RAISE EXCEPTION 'COMPLIMENTARY_FORBIDDEN' USING ERRCODE='42501'; END IF;
 RETURN r;
END $$;
CREATE FUNCTION public.native_sales_complimentary_admit(p_subject text) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE n integer;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' OR p_subject IS NULL OR p_subject !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'COMPLIMENTARY_FORBIDDEN'; END IF;
 INSERT INTO public.sales_complimentary_attempts(subject_hash) VALUES(p_subject)
 ON CONFLICT(subject_hash) DO UPDATE SET
 attempts=CASE WHEN sales_complimentary_attempts.window_start<now()-interval '15 minutes' THEN 1 ELSE sales_complimentary_attempts.attempts+1 END,
 window_start=CASE WHEN sales_complimentary_attempts.window_start<now()-interval '15 minutes' THEN now() ELSE sales_complimentary_attempts.window_start END
 RETURNING attempts INTO n;
 RETURN n<=10;
END $$;
-- The existing paid QBO functions are left intact. Only the trigger predicates change.
DROP TRIGGER sales_patient_qbo_membership_guard ON public.sales_memberships;
CREATE TRIGGER sales_patient_qbo_membership_guard BEFORE INSERT OR UPDATE OF status,sales_payment_id,opportunity_id,is_demo ON public.sales_memberships
 FOR EACH ROW WHEN(NEW.funding_type='PAID') EXECUTE FUNCTION public.native_sales_patient_qbo_membership_guard();
DROP TRIGGER sales_patient_qbo_after_membership ON public.sales_memberships;
CREATE TRIGGER sales_patient_qbo_after_membership AFTER INSERT OR UPDATE OF status ON public.sales_memberships
 FOR EACH ROW WHEN(NEW.funding_type='PAID') EXECUTE FUNCTION public.native_sales_patient_qbo_after_membership();
CREATE FUNCTION public.native_sales_complimentary_membership_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE b public.sales_complimentary_benefits%ROWTYPE;
BEGIN
 IF TG_OP='UPDATE' AND (OLD.funding_type,OLD.complimentary_benefit_id) IS DISTINCT FROM (NEW.funding_type,NEW.complimentary_benefit_id) THEN
 RAISE EXCEPTION 'COMPLIMENTARY_FUNDING_IMMUTABLE'; END IF;
 IF NEW.funding_type='PAID' THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND (OLD.plan,OLD.duration,OLD.primary_contact_id,OLD.created_by,OLD.issued_at) IS DISTINCT FROM (NEW.plan,NEW.duration,NEW.primary_contact_id,NEW.created_by,NEW.issued_at) THEN RAISE EXCEPTION 'COMPLIMENTARY_TERMS_IMMUTABLE'; END IF;
 SELECT * INTO b FROM public.sales_complimentary_benefits WHERE organization_id=NEW.organization_id AND id=NEW.complimentary_benefit_id;
 IF NOT FOUND OR b.authorization_status<>'APPROVED' OR b.beneficiary_contact_id IS DISTINCT FROM NEW.primary_contact_id
 OR b.plan<>NEW.plan OR b.membership_id IS DISTINCT FROM NEW.id
 OR NEW.status IS DISTINCT FROM (CASE WHEN b.status='ACTIVE' THEN 'ACTIVE' WHEN b.status='EXPIRED' THEN 'EXPIRED' ELSE 'CANCELLED' END)
 OR NEW.expires_at<>(b.expires_at AT TIME ZONE b.timezone)::date-1
 OR NEW.issued_at<>(b.activated_at AT TIME ZONE b.timezone)::date
 OR (NEW.status='ACTIVE' AND (b.status<>'ACTIVE' OR b.expires_at<=now())) THEN
 RAISE EXCEPTION 'COMPLIMENTARY_AUTHORIZATION_REQUIRED' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER aaa_complimentary_membership_guard BEFORE INSERT OR UPDATE ON public.sales_memberships
 FOR EACH ROW EXECUTE FUNCTION public.native_sales_complimentary_membership_guard();
-- Reject courtesy renewal/addition intents before they can reach any invoice pipeline.
CREATE FUNCTION public.native_sales_complimentary_billing_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.sales_memberships m WHERE m.organization_id=NEW.organization_id
 AND m.id IN (NEW.renewal_membership_id,NEW.family_membership_id) AND m.funding_type='COMPLIMENTARY') THEN
 RAISE EXCEPTION 'COMPLIMENTARY_PAID_CONSENT_REQUIRED' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER aaa_complimentary_billing_guard BEFORE INSERT OR UPDATE ON public.sales_patient_enrollment_intents
 FOR EACH ROW EXECUTE FUNCTION public.native_sales_complimentary_billing_guard();

-- Internal activation is not exposed to service_role: only the checked entry points call it.
CREATE FUNCTION public.native_sales_complimentary_activate(p_id uuid,p_contact uuid,p_auth uuid DEFAULT NULL) RETURNS jsonb
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
-- Find the actual FK name rather than assuming its generated spelling.
DO $$ DECLARE c record; BEGIN
 FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='public.sales_complimentary_benefits'::regclass
 AND confrelid='public.sales_memberships'::regclass LOOP
 EXECUTE format('ALTER TABLE public.sales_complimentary_benefits ALTER CONSTRAINT %I DEFERRABLE INITIALLY DEFERRED',c.conname);
 END LOOP;
END $$;

CREATE FUNCTION public.native_sales_complimentary_issue(p_org uuid,p_actor uuid,p_key uuid,p_hash text,p_plan text,p_months integer,
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
CREATE FUNCTION public.native_sales_complimentary_redeem(p_org uuid,p_auth uuid,p_code_hash text,p_preview boolean) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE b public.sales_complimentary_benefits%ROWTYPE;i public.sales_patient_identities%ROWTYPE;verified_email text;target uuid;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'COMPLIMENTARY_FORBIDDEN' USING ERRCODE='42501'; END IF;
 SELECT lower(btrim(email)) INTO verified_email FROM auth.users WHERE id=p_auth AND email_confirmed_at IS NOT NULL
 AND deleted_at IS NULL AND (banned_until IS NULL OR banned_until<=now());
 IF verified_email IS NULL THEN RAISE EXCEPTION 'COMPLIMENTARY_CODE_UNAVAILABLE'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.sales_complimentary_settings s JOIN public.sales_organizations o ON o.id=s.organization_id WHERE s.organization_id=p_org AND s.enabled AND o.status='active') THEN RAISE EXCEPTION 'COMPLIMENTARY_CODE_UNAVAILABLE'; END IF;
 SELECT * INTO b FROM public.sales_complimentary_benefits WHERE organization_id=p_org AND code_hash=p_code_hash FOR UPDATE;
 IF NOT FOUND OR b.valid_from>now() OR b.redeem_before<=now()
 OR (b.activation_method='REDEMPTION_CODE' AND b.status<>'PENDING')
 OR (b.activation_method='ADMIN_DIRECT' AND (b.status<>'ACTIVE' OR b.invitation_claimed_at IS NOT NULL OR b.expires_at<=now())) THEN RAISE EXCEPTION 'COMPLIMENTARY_CODE_UNAVAILABLE'; END IF;
 -- A verified email alone never links a preexisting contact. The assigned secret is
 -- the additional, explicit administrator authorization for exactly this beneficiary.
 PERFORM pg_advisory_xact_lock(hashtextextended('complimentary-identity:'||p_auth::text,0));
 SELECT * INTO i FROM public.sales_patient_identities WHERE auth_id=p_auth;
 IF FOUND THEN
 IF i.organization_id<>p_org OR (b.beneficiary_contact_id IS NOT NULL AND b.beneficiary_contact_id<>i.contact_id) THEN RAISE EXCEPTION 'COMPLIMENTARY_CODE_UNAVAILABLE'; END IF;
 target:=i.contact_id;
 ELSE
 target:=b.beneficiary_contact_id;
 IF target IS NULL OR EXISTS(SELECT 1 FROM public.usuarios WHERE auth_id=p_auth)
 OR NOT EXISTS(SELECT 1 FROM public.sales_contacts WHERE organization_id=p_org AND id=target AND archived_at IS NULL AND lower(btrim(email))=verified_email)
 OR EXISTS(SELECT 1 FROM public.sales_patient_identities WHERE organization_id=p_org AND contact_id=target)
 OR (SELECT count(*) FROM public.sales_contacts WHERE lower(btrim(email))=verified_email)<>1 THEN RAISE EXCEPTION 'COMPLIMENTARY_ACCOUNT_REVIEW_REQUIRED'; END IF;
 IF NOT p_preview THEN
 INSERT INTO public.sales_patient_identities(organization_id,auth_id,contact_id,source,approved_evidence)
 VALUES(p_org,p_auth,target,'APPROVED_LEGACY','complimentary-beneficiary:'||b.id::text);
 INSERT INTO public.sales_complimentary_events(organization_id,benefit_id,actor_auth_id,action) VALUES(p_org,b.id,p_auth,'PORTAL_IDENTITY_LINKED');
 END IF;
 END IF;
 IF p_preview IS TRUE THEN RETURN jsonb_build_object('plan',b.plan,'durationMonths',b.duration_months,'fundingType','COMPLIMENTARY','paymentRequirement','WAIVED'); END IF;
 IF b.activation_method='ADMIN_DIRECT' THEN
 UPDATE public.sales_complimentary_benefits SET invitation_claimed_at=now(),updated_at=now() WHERE id=b.id;
 INSERT INTO public.sales_complimentary_events(organization_id,benefit_id,actor_auth_id,action) VALUES(p_org,b.id,p_auth,'INVITATION_CLAIMED');
 RETURN jsonb_build_object('membershipId',b.membership_id,'plan',b.plan,'durationMonths',b.duration_months,'status','ACTIVE','fundingType','COMPLIMENTARY');
 END IF;
 RETURN public.native_sales_complimentary_activate(b.id,target,p_auth);
END $$;
CREATE FUNCTION public.native_sales_complimentary_action(p_org uuid,p_actor uuid,p_id uuid,p_action text,p_months integer,p_reason text,p_key uuid DEFAULT gen_random_uuid()) RETURNS jsonb
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
CREATE FUNCTION public.native_sales_complimentary_configure(p_org uuid,p_actor uuid,p_timezone text,p_days integer[],p_enabled boolean) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 PERFORM public.native_sales_complimentary_admin(p_org,p_actor);
 IF p_timezone IS NULL OR NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=p_timezone)
 OR p_days IS NULL OR cardinality(p_days)>10 OR EXISTS(SELECT 1 FROM unnest(p_days) d WHERE d IS NULL OR d<0 OR d>365)
 OR p_enabled IS NULL THEN RAISE EXCEPTION 'COMPLIMENTARY_INVALID_REQUEST'; END IF;
 INSERT INTO public.sales_complimentary_settings(organization_id,timezone,notification_days,enabled) VALUES(p_org,p_timezone,p_days,p_enabled)
 ON CONFLICT(organization_id) DO UPDATE SET timezone=excluded.timezone,notification_days=excluded.notification_days,enabled=excluded.enabled;
 RETURN jsonb_build_object('enabled',p_enabled,'timezone',p_timezone,'notificationDays',p_days);
END $$;
CREATE FUNCTION public.native_sales_complimentary_list(p_org uuid,p_actor uuid,p_offset integer,p_query text,p_status text) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE rows jsonb;summary jsonb;
BEGIN
 PERFORM public.native_sales_complimentary_admin(p_org,p_actor);
 IF p_offset IS NULL OR p_offset NOT BETWEEN 0 AND 100000 OR length(coalesce(p_query,''))>160 THEN RAISE EXCEPTION 'COMPLIMENTARY_INVALID_REQUEST'; END IF;
 WITH scoped AS (
 SELECT b.id,b.plan,b.duration_months,b.reason,b.campaign,b.activation_method,b.authorization_status,b.authorized_by,
 a.display_name AS administrator,b.authorized_at,b.activated_at,b.expires_at,b.redeemed_at,b.redeemed_by,
 b.beneficiary_contact_id,b.membership_id,b.valid_from,b.redeem_before,b.timezone,c.display_name AS beneficiary,
 CASE WHEN b.status='PENDING' AND b.redeem_before<=now() OR b.status='ACTIVE' AND b.expires_at<=now() THEN 'EXPIRED' ELSE b.status END AS status,
 CASE WHEN b.activation_method<>'REDEMPTION_CODE' THEN NULL WHEN b.redeemed_at IS NOT NULL THEN 'REDEEMED'
 WHEN b.status='REVOKED' THEN 'REVOKED' WHEN b.redeem_before<=now() THEN 'EXPIRED' ELSE 'UNUSED' END AS code_status
 FROM public.sales_complimentary_benefits b LEFT JOIN public.sales_contacts c ON c.organization_id=b.organization_id AND c.id=b.beneficiary_contact_id
 JOIN public.sales_members a ON a.organization_id=b.organization_id AND a.id=b.authorized_by WHERE b.organization_id=p_org)
 SELECT coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) INTO rows FROM (
 SELECT * FROM scoped WHERE (coalesce(p_status,'')='' OR status=p_status OR code_status=p_status)
 AND (coalesce(p_query,'')='' OR concat_ws(' ',beneficiary,reason,campaign,plan,administrator) ILIKE '%'||p_query||'%')
 ORDER BY authorized_at DESC,id DESC LIMIT 50 OFFSET p_offset) q;
 SELECT jsonb_build_object('totalMembers',count(DISTINCT beneficiary_contact_id) FILTER(WHERE membership_id IS NOT NULL),
 'active',count(*) FILTER(WHERE status='ACTIVE' AND expires_at>now()),
 'expiringSoon',count(*) FILTER(WHERE status='ACTIVE' AND expires_at>now() AND expires_at<=now()+interval '30 days'),
 'expired',count(*) FILTER(WHERE membership_id IS NOT NULL AND (status='EXPIRED' OR status='ACTIVE' AND expires_at<=now())),
 'generated',count(*) FILTER(WHERE activation_method='REDEMPTION_CODE'),
 'redeemed',count(*) FILTER(WHERE redeemed_at IS NOT NULL),
 'expiredCodes',count(*) FILTER(WHERE activation_method='REDEMPTION_CODE' AND redeemed_at IS NULL AND status<>'REVOKED' AND redeem_before<=now()),
 'revokedCodes',count(*) FILTER(WHERE activation_method='REDEMPTION_CODE' AND status='REVOKED' AND redeemed_at IS NULL),
 'unusedCodes',count(*) FILTER(WHERE activation_method='REDEMPTION_CODE' AND status='PENDING' AND redeem_before>now()),
 'byPlan',(SELECT coalesce(jsonb_object_agg(plan,n),'{}'::jsonb) FROM (SELECT plan,count(DISTINCT beneficiary_contact_id) n FROM public.sales_complimentary_benefits WHERE organization_id=p_org AND membership_id IS NOT NULL GROUP BY plan) q),
 'byReason',(SELECT coalesce(jsonb_object_agg(reason,n),'{}'::jsonb) FROM (SELECT reason,count(DISTINCT beneficiary_contact_id) n FROM public.sales_complimentary_benefits WHERE organization_id=p_org AND membership_id IS NOT NULL GROUP BY reason) q),
 'byAdministrator',(SELECT coalesce(jsonb_object_agg(authorized_by,n),'{}'::jsonb) FROM (SELECT authorized_by,count(*) n FROM public.sales_complimentary_benefits WHERE organization_id=p_org GROUP BY authorized_by) q))
 INTO summary FROM public.sales_complimentary_benefits WHERE organization_id=p_org;
 RETURN jsonb_build_object('rows',rows,'summary',summary,'nextOffset',CASE WHEN jsonb_array_length(rows)=50 THEN p_offset+50 END,
 'settings',(SELECT to_jsonb(s)-'organization_id' FROM public.sales_complimentary_settings s WHERE organization_id=p_org));
END $$;
REVOKE ALL ON FUNCTION public.native_sales_complimentary_configure(uuid,uuid,text,integer[],boolean),
 public.native_sales_complimentary_list(uuid,uuid,integer,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_complimentary_configure(uuid,uuid,text,integer[],boolean),
 public.native_sales_complimentary_list(uuid,uuid,integer,text,text) TO service_role;
-- Serialize paid/courtesy overlap checks through the canonical contact row.
CREATE FUNCTION public.native_sales_complimentary_overlap_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.status<>'ACTIVE' THEN RETURN NEW; END IF;
 PERFORM 1 FROM public.sales_contacts WHERE organization_id=NEW.organization_id AND id=NEW.primary_contact_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.sales_memberships m WHERE m.organization_id=NEW.organization_id AND m.primary_contact_id=NEW.primary_contact_id
 AND m.id<>NEW.id AND m.status='ACTIVE' AND (NEW.funding_type='COMPLIMENTARY' OR m.funding_type='COMPLIMENTARY')
 AND daterange(m.issued_at,m.expires_at,'[]') && daterange(NEW.issued_at,NEW.expires_at,'[]')) THEN
 RAISE EXCEPTION 'COMPLIMENTARY_ACCOUNT_REVIEW_REQUIRED'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER aab_complimentary_overlap_guard BEFORE INSERT OR UPDATE ON public.sales_memberships
 FOR EACH ROW EXECUTE FUNCTION public.native_sales_complimentary_overlap_guard();
REVOKE ALL ON FUNCTION public.native_sales_complimentary_overlap_guard() FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.native_sales_complimentary_due(p_org uuid) RETURNS jsonb
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
REVOKE ALL ON FUNCTION public.native_sales_complimentary_due(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_complimentary_due(uuid) TO service_role;
-- Courtesy activations are reported separately and never counted as membership sales.
DO $$ DECLARE definition text; BEGIN
 definition:=pg_get_functiondef('public.native_sales_report_detail(uuid,uuid,date,date)'::regprocedure);
 IF position('WHERE m.organization_id=p_organization_id AND NOT m.is_demo' IN definition)=0 THEN RAISE EXCEPTION 'COMPLIMENTARY_REPORT_DRIFT'; END IF;
 EXECUTE replace(definition,'WHERE m.organization_id=p_organization_id AND NOT m.is_demo','WHERE m.organization_id=p_organization_id AND NOT m.is_demo AND m.funding_type=''PAID''');
END $$;
-- No exposed function may rely on a caller-controlled actor without server authentication.
REVOKE ALL ON FUNCTION public.native_sales_complimentary_admin(uuid,uuid),public.native_sales_complimentary_activate(uuid,uuid,uuid),
 public.native_sales_complimentary_admit(text),public.native_sales_complimentary_membership_guard(),public.native_sales_complimentary_billing_guard(),
 public.native_sales_complimentary_issue(uuid,uuid,uuid,text,text,integer,text,uuid,text,text,text,timestamptz,timestamptz),
 public.native_sales_complimentary_redeem(uuid,uuid,text,boolean),public.native_sales_complimentary_action(uuid,uuid,uuid,text,integer,text,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.native_sales_complimentary_admit(text),
 public.native_sales_complimentary_issue(uuid,uuid,uuid,text,text,integer,text,uuid,text,text,text,timestamptz,timestamptz),
 public.native_sales_complimentary_redeem(uuid,uuid,text,boolean),public.native_sales_complimentary_action(uuid,uuid,uuid,text,integer,text,uuid) TO service_role;
COMMIT;
