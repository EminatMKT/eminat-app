-- Catalog-only verification; no patient/business rows and no schema changes.
-- Trigger pseudo-types are not callable RPCs. Check their SECURITY DEFINER paths,
-- but assess invocation through the protected target table rather than EXECUTE ACL.
-- native_sales_guard_converted_lead is an invoker trigger on service-only sales_leads.
BEGIN READ ONLY;
DO $$
DECLARE problem text;
BEGIN
  SELECT string_agg(c.relname, ', ' ORDER BY c.relname) INTO problem
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','p')
    AND c.relname LIKE 'sales\_%' ESCAPE '\'
    AND (NOT c.relrowsecurity
      OR has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE')
      OR has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE'));
  IF problem IS NOT NULL THEN RAISE EXCEPTION 'SALES_TABLE_SECURITY: %',problem; END IF;

  SELECT string_agg(p.oid::regprocedure::text, ', ' ORDER BY p.proname) INTO problem
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname LIKE 'native\_sales\_%' ESCAPE '\'
    AND ((p.prorettype NOT IN ('trigger'::regtype,'event_trigger'::regtype) AND
      (has_function_privilege('anon',p.oid,'EXECUTE')
       OR has_function_privilege('authenticated',p.oid,'EXECUTE')))
      OR (p.prosecdef AND NOT EXISTS (
        SELECT 1 FROM unnest(p.proconfig) setting
        -- Existing controlled binding uses an empty path and schema-qualified tables.
        WHERE replace(setting,' ','') IN ('search_path=public,pg_temp','search_path=""','search_path=')
      )));
  IF problem IS NOT NULL THEN RAISE EXCEPTION 'SALES_ROUTINE_SECURITY: %',problem; END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname='sales_patient_identities')
    OR NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname='native_sales_patient_claim_contact') THEN
    RAISE EXCEPTION 'PATIENT_SECURITY_CATALOG_MISSING';
  END IF;
END $$;
SELECT true AS security_privacy_catalog_pass;
ROLLBACK;
