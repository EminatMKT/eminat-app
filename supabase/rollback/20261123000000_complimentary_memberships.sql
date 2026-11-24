BEGIN;
-- Never discard populated authorization history. Roll back the app with schema retained instead.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.sales_complimentary_benefits) OR EXISTS(SELECT 1 FROM public.sales_complimentary_events)
 OR EXISTS(SELECT 1 FROM public.sales_memberships WHERE funding_type='COMPLIMENTARY') THEN RAISE EXCEPTION 'POPULATED_HISTORY_REQUIRES_FORWARD_REPAIR'; END IF;
END $$;
DROP TRIGGER aaa_complimentary_membership_guard ON public.sales_memberships;
DROP TRIGGER aab_complimentary_overlap_guard ON public.sales_memberships;
DROP TRIGGER aaa_complimentary_billing_guard ON public.sales_patient_enrollment_intents;
DROP TRIGGER sales_patient_qbo_membership_guard ON public.sales_memberships;
CREATE TRIGGER sales_patient_qbo_membership_guard BEFORE INSERT OR UPDATE OF status,sales_payment_id,opportunity_id,is_demo ON public.sales_memberships
 FOR EACH ROW EXECUTE FUNCTION public.native_sales_patient_qbo_membership_guard();
DROP TRIGGER sales_patient_qbo_after_membership ON public.sales_memberships;
CREATE TRIGGER sales_patient_qbo_after_membership AFTER INSERT OR UPDATE OF status ON public.sales_memberships
 FOR EACH ROW EXECUTE FUNCTION public.native_sales_patient_qbo_after_membership();
ALTER TABLE public.sales_memberships DROP CONSTRAINT sales_memberships_active_payment_or_waiver;
ALTER TABLE public.sales_memberships ADD CONSTRAINT sales_memberships_check2 CHECK(status<>'ACTIVE' OR is_demo OR legacy_annie_id IS NOT NULL OR sales_payment_id IS NOT NULL);
DO $$ DECLARE definition text; BEGIN
 definition:=pg_get_functiondef('public.native_sales_report_detail(uuid,uuid,date,date)'::regprocedure);
 EXECUTE replace(definition,' AND m.funding_type=''PAID''','');
END $$;
DROP FUNCTION public.native_sales_complimentary_due(uuid);
ALTER TABLE public.sales_memberships DROP COLUMN complimentary_benefit_id;
ALTER TABLE public.sales_memberships DROP COLUMN funding_type;
DO $$ DECLARE t text;c record; BEGIN
 FOREACH t IN ARRAY ARRAY['sales_memberships','sales_membership_periods'] LOOP
 FOR c IN SELECT conname,pg_get_constraintdef(oid) def FROM pg_constraint WHERE conrelid=('public.'||t)::regclass AND contype='c' LOOP
 IF c.def LIKE '%CUSTOM%' THEN
 EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I',t,c.conname);
 EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I %s',t,c.conname,replace(c.def,', ''CUSTOM''::text',''));
 END IF;
 END LOOP;
 END LOOP;
END $$;
DROP FUNCTION public.native_sales_complimentary_overlap_guard(),public.native_sales_complimentary_membership_guard(),public.native_sales_complimentary_billing_guard(),
 public.native_sales_complimentary_list(uuid,uuid,integer,text,text),public.native_sales_complimentary_configure(uuid,uuid,text,integer[],boolean),
 public.native_sales_complimentary_action(uuid,uuid,uuid,text,integer,text,uuid),public.native_sales_complimentary_redeem(uuid,uuid,text,boolean),
 public.native_sales_complimentary_issue(uuid,uuid,uuid,text,text,integer,text,uuid,text,text,text,timestamptz,timestamptz),
 public.native_sales_complimentary_activate(uuid,uuid,uuid),public.native_sales_complimentary_admin(uuid,uuid),public.native_sales_complimentary_admit(text);
DROP TABLE public.sales_complimentary_attempts,public.sales_complimentary_events,public.sales_complimentary_benefits,public.sales_complimentary_settings;
COMMIT;
