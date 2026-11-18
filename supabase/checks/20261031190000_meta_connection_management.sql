\set ON_ERROR_STOP on
-- Read-only post-migration verification; fixture rehearsal is in scripts/qa/.
BEGIN READ ONLY;
DO $$ DECLARE table_name text; signature text; BEGIN
 FOREACH table_name IN ARRAY ARRAY['sales_social_company_bindings','sales_social_grants',
  'sales_social_discovered_assets','sales_social_asset_ownership','sales_social_phase1_rpc_backup'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class c WHERE c.oid=to_regclass('public.'||table_name) AND c.relrowsecurity) THEN
   RAISE EXCEPTION 'META_RLS_MISSING'; END IF;
  IF has_table_privilege('anon','public.'||table_name,'SELECT,INSERT,UPDATE,DELETE')
   OR has_table_privilege('authenticated','public.'||table_name,'SELECT,INSERT,UPDATE,DELETE') THEN
   RAISE EXCEPTION 'META_BROWSER_TABLE_ACCESS'; END IF;
 END LOOP;
 FOREACH signature IN ARRAY ARRAY[
  'public.native_meta_require_company(uuid,uuid,text)',
  'public.native_meta_begin(uuid,uuid,text,text,text,uuid,boolean)',
  'public.native_meta_exchange_claim(text,uuid,uuid)',
  'public.native_meta_exchange_finish(uuid,uuid,uuid,text,text,timestamptz,jsonb,jsonb)',
  'public.native_meta_complete(uuid,uuid,uuid,uuid,uuid,text,jsonb,text)',
  'public.native_meta_disconnect(uuid,uuid,uuid)',
  'public.native_meta_expire_access()',
  'public.native_meta_record_health(uuid,uuid,uuid,uuid,text,jsonb)'] LOOP
  IF to_regprocedure(signature) IS NULL THEN RAISE EXCEPTION 'META_RPC_MISSING'; END IF;
  IF has_function_privilege('anon',signature,'EXECUTE')
   OR has_function_privilege('authenticated',signature,'EXECUTE')
   OR NOT has_function_privilege('service_role',signature,'EXECUTE') THEN
   RAISE EXCEPTION 'META_RPC_ACL_INVALID'; END IF;
 END LOOP;
 FOREACH signature IN ARRAY ARRAY[
  'public.native_sales_complete_meta_page(uuid,uuid,uuid,uuid,text,text,text,text,text,text,text,timestamptz)',
  'public.native_sales_refresh_meta_connection(uuid,uuid,uuid,text,text,text,timestamptz,jsonb)',
  'public.native_sales_mark_meta_page_subscribed(uuid,uuid,uuid)',
  'public.native_sales_revoke_meta_connection(uuid,uuid,uuid)'] LOOP
  IF has_function_privilege('service_role',signature,'EXECUTE') THEN
   RAISE EXCEPTION 'META_LEGACY_RPC_ENABLED'; END IF;
 END LOOP;
 IF (SELECT count(*) FROM public.sales_social_phase1_rpc_backup)<>3 THEN
  RAISE EXCEPTION 'META_ROLLBACK_BACKUP_INCOMPLETE'; END IF;
 IF position('META_INGESTION_DISABLED' IN pg_get_functiondef(
  'public.native_sales_receive_social_event(text,text,text,timestamptz,jsonb,text,uuid,uuid)'::regprocedure))=0
  OR position('META_INGESTION_DISABLED' IN pg_get_functiondef(
   'public.native_sales_retry_social_lead(uuid,jsonb)'::regprocedure))=0 THEN
  RAISE EXCEPTION 'META_INGESTION_FENCE_MISSING'; END IF;
 IF EXISTS(SELECT 1 FROM public.native_sales_claim_social_leads(10)) THEN
  RAISE EXCEPTION 'META_RETRY_CLAIM_ENABLED'; END IF;
 IF EXISTS(SELECT 1 FROM public.sales_social_assets a JOIN public.sales_social_accounts ac ON ac.id=a.account_id
  JOIN public.sales_social_integrations i ON i.id=ac.integration_id
  WHERE i.provider_code='META' AND a.status='SUBSCRIBED') THEN
  RAISE EXCEPTION 'META_SUBSCRIPTION_PRESENT'; END IF;
END $$;
SELECT 'PASS: RLS, ACLs, RPCs, backup and ingestion fences' AS result;
ROLLBACK;
