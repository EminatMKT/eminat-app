-- Guarded CLEAN-SCHEMA down migration only. Refuse once Phase 1 contains data.
-- For populated installations: disable OAuth UI, keep ingestion fences and preserve all tables;
-- roll the application back only after a separately reviewed retention/credential plan.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $$ DECLARE f record; BEGIN
 IF EXISTS(SELECT 1 FROM public.sales_social_integrations WHERE provider_code='META')
  OR EXISTS(SELECT 1 FROM public.sales_social_company_bindings)
  OR EXISTS(SELECT 1 FROM public.sales_social_grants)
  OR EXISTS(SELECT 1 FROM public.sales_social_oauth_states WHERE company_code IS NOT NULL)
  OR EXISTS(SELECT 1 FROM public.sales_social_providers WHERE code='META' AND enabled) THEN
  RAISE EXCEPTION 'META_POPULATED_ROLLBACK_REQUIRES_REVIEW'; END IF;
 FOR f IN SELECT definition FROM public.sales_social_phase1_rpc_backup LOOP EXECUTE f.definition; END LOOP;
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname IN ('native_meta_require_company','native_meta_begin','native_meta_exchange_claim','native_meta_complete','native_meta_disconnect','native_meta_exchange_finish','native_meta_expire_access','native_meta_record_health') LOOP
  EXECUTE format('DROP FUNCTION %s',f.signature);
 END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.native_sales_complete_meta_page(uuid,uuid,uuid,uuid,text,text,text,text,text,text,text,timestamptz),
 public.native_sales_refresh_meta_connection(uuid,uuid,uuid,text,text,text,timestamptz,jsonb),
 public.native_sales_mark_meta_page_subscribed(uuid,uuid,uuid),public.native_sales_revoke_meta_connection(uuid,uuid,uuid) TO service_role;
DROP TABLE public.sales_social_asset_ownership,public.sales_social_discovered_assets;
ALTER TABLE public.sales_social_oauth_states DROP COLUMN company_code,DROP COLUMN return_path,DROP COLUMN reconnect_integration_id,DROP COLUMN meta_user_id,DROP COLUMN app_id;
ALTER TABLE public.sales_social_assets DROP COLUMN company_code,DROP COLUMN generation,DROP COLUMN reported_business_id,DROP COLUMN relationship;
ALTER TABLE public.sales_social_accounts DROP COLUMN company_code;
ALTER TABLE public.sales_social_integrations DROP COLUMN grant_id,DROP COLUMN company_code,DROP COLUMN provider_cleanup,DROP COLUMN provider_cleanup_error;
ALTER TABLE public.sales_social_oauth_states DROP CONSTRAINT sales_social_oauth_states_status_check;
ALTER TABLE public.sales_social_oauth_states ADD CONSTRAINT sales_social_oauth_states_status_check CHECK(status IN ('PENDING','EXCHANGED','CONSUMED'));
ALTER TABLE public.sales_social_webhook_receipts DROP COLUMN asset_generation;
DROP TABLE public.sales_social_grants,public.sales_social_company_bindings,public.sales_social_phase1_rpc_backup;
COMMIT;
