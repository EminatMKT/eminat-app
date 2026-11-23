\set ON_ERROR_STOP on
-- Read-only post-migration verification; fixture rehearsal is in scripts/qa/.
BEGIN READ ONLY;
DO $$ BEGIN
 IF to_regprocedure('public.native_meta_active_company_admin(uuid,uuid,text)') IS NULL THEN
  RAISE EXCEPTION 'META_SHARED_PREDICATE_MISSING'; END IF;
 IF has_function_privilege('anon','public.native_meta_active_company_admin(uuid,uuid,text)','EXECUTE')
  OR has_function_privilege('authenticated','public.native_meta_active_company_admin(uuid,uuid,text)','EXECUTE')
  OR NOT has_function_privilege('service_role','public.native_meta_active_company_admin(uuid,uuid,text)','EXECUTE') THEN
  RAISE EXCEPTION 'META_SHARED_PREDICATE_ACL_INVALID'; END IF;
 IF position('native_meta_active_company_admin' IN pg_get_functiondef(
  'public.native_meta_require_company(uuid,uuid,text)'::regprocedure))=0
  OR position('native_meta_active_company_admin' IN pg_get_functiondef(
   'public.native_meta_expire_access()'::regprocedure))=0 THEN
  RAISE EXCEPTION 'META_SHARED_PREDICATE_NOT_REUSED'; END IF;
END $$;
SELECT 'PASS: shared company-admin predicate present, ACL-safe and reused by both callers' AS result;
ROLLBACK;
