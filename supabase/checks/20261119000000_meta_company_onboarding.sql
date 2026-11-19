\set ON_ERROR_STOP on
BEGIN READ ONLY;
DO $$ DECLARE r text; f text; BEGIN
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.sales_social_company_binding_events'::regclass) THEN
  RAISE EXCEPTION 'META_ONBOARDING_RLS_REQUIRED'; END IF;
 FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF has_table_privilege(r,'public.sales_social_company_binding_events','SELECT,INSERT,UPDATE,DELETE') THEN
   RAISE EXCEPTION 'META_ONBOARDING_BROWSER_TABLE_ACCESS'; END IF;
  FOREACH f IN ARRAY ARRAY['native_meta_onboarding_actor(uuid,uuid)',
   'native_meta_onboarding_companies(uuid,uuid)','native_meta_manage_company(uuid,uuid,text,boolean,text)'] LOOP
   IF has_function_privilege(r,'public.'||f,'EXECUTE') OR NOT has_function_privilege('service_role','public.'||f,'EXECUTE') THEN
    RAISE EXCEPTION 'META_ONBOARDING_RPC_ACL_INVALID'; END IF;
  END LOOP;
 END LOOP;
 IF has_table_privilege('service_role','public.sales_social_company_binding_events','UPDATE,DELETE') THEN
  RAISE EXCEPTION 'META_ONBOARDING_HISTORY_MUTABLE'; END IF;
END $$;
SELECT 'PASS: browser denials, service RPC grants and append-only history' AS result;
ROLLBACK;
