\set ON_ERROR_STOP on
-- Read-only preflight. Does not approve a target or authorize applying the migration.
BEGIN READ ONLY;
SET LOCAL lock_timeout='5s';
DO $$ BEGIN
 IF to_regprocedure('public.native_meta_require_company(uuid,uuid,text)') IS NULL
  OR to_regprocedure('public.native_meta_expire_access()') IS NULL THEN
  RAISE EXCEPTION 'META_PHASE1_PREREQUISITE_MISSING'; END IF;
 IF to_regprocedure('public.native_meta_active_company_admin(uuid,uuid,text)') IS NOT NULL THEN
  RAISE EXCEPTION 'META_SHARED_PREDICATE_ALREADY_PRESENT'; END IF;
END $$;
SELECT 'PASS: prerequisite Meta functions present; shared predicate not yet applied' AS result;
ROLLBACK;
