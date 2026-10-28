-- Catalog-only verification; no patient/business rows and no schema changes.
-- Safe for a read-only transaction on Production or the protected equivalent.
BEGIN READ ONLY;
WITH tables AS (
  SELECT c.oid, c.relrowsecurity
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','p')
    AND c.relname LIKE 'sales\_%' ESCAPE '\'
), routines AS (
  SELECT p.oid, p.prosecdef, p.proconfig
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname LIKE 'native\_sales\_%' ESCAPE '\'
)
SELECT (SELECT count(*) > 0 AND bool_and(relrowsecurity
    AND NOT has_table_privilege('anon',oid,'SELECT,INSERT,UPDATE,DELETE')
    AND NOT has_table_privilege('authenticated',oid,'SELECT,INSERT,UPDATE,DELETE')) FROM tables)
  AND (SELECT count(*) > 0 AND bool_and(
    NOT has_function_privilege('anon',oid,'EXECUTE')
    AND NOT has_function_privilege('authenticated',oid,'EXECUTE')
    AND (NOT prosecdef OR EXISTS (
      SELECT 1 FROM unnest(proconfig) setting
      WHERE replace(setting,' ','')='search_path=public,pg_temp'
    ))) FROM routines) AS security_privacy_catalog_pass;
ROLLBACK;
