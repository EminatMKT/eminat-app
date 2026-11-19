\set ON_ERROR_STOP on
BEGIN READ ONLY;
DO $$ BEGIN
 IF to_regclass('public.sales_social_company_binding_events') IS NOT NULL THEN
  RAISE EXCEPTION 'META_ONBOARDING_ALREADY_PRESENT'; END IF;
 IF to_regprocedure('public.native_meta_expire_access()') IS NULL OR
 to_regclass('public.sales_social_company_bindings') IS NULL OR
 to_regclass('public.usuario_empresas_acceso') IS NULL THEN
  RAISE EXCEPTION 'META_PHASE1_PREREQUISITE_MISSING'; END IF;
 IF EXISTS(SELECT 1 FROM pg_class WHERE oid IN ('public.sales_social_company_bindings'::regclass,
 'public.usuario_empresas_acceso'::regclass) AND NOT relrowsecurity) THEN
  RAISE EXCEPTION 'META_EXISTING_RLS_REQUIRED'; END IF;
END $$;
SELECT 'PASS: Meta self-service prerequisites; no changes applied' AS result;
ROLLBACK;
