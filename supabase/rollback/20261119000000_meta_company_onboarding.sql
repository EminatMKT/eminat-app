\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout='5s';
LOCK TABLE public.sales_social_company_binding_events IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.sales_social_company_binding_events) THEN
  RAISE EXCEPTION 'META_ONBOARDING_POPULATED_ROLLBACK_REQUIRES_REVIEW'; END IF;
END $$;
DROP FUNCTION public.native_meta_manage_company(uuid,uuid,text,boolean,text);
DROP FUNCTION public.native_meta_onboarding_companies(uuid,uuid);
DROP FUNCTION public.native_meta_onboarding_actor(uuid,uuid);
DROP TABLE public.sales_social_company_binding_events;
-- Existing company bindings, permissions, grants and reservations are untouched.
COMMIT;
