\set ON_ERROR_STOP on
-- Read-only preflight. Does not approve a target or authorize applying the migration.
BEGIN READ ONLY;
SET LOCAL lock_timeout='5s';
DO $$ DECLARE signature text; BEGIN
 IF to_regclass('public.sales_social_company_bindings') IS NOT NULL THEN
  RAISE EXCEPTION 'META_PHASE1_ALREADY_PRESENT'; END IF;
 FOREACH signature IN ARRAY ARRAY[
  'public.native_sales_receive_social_event(text,text,text,timestamptz,jsonb,text,uuid,uuid)',
  'public.native_sales_retry_social_lead(uuid,jsonb)',
  'public.native_sales_claim_social_leads(integer)',
  'public.native_sales_complete_meta_page(uuid,uuid,uuid,uuid,text,text,text,text,text,text,text,timestamptz)',
  'public.native_sales_refresh_meta_connection(uuid,uuid,uuid,text,text,text,timestamptz,jsonb)',
  'public.native_sales_mark_meta_page_subscribed(uuid,uuid,uuid)',
  'public.native_sales_revoke_meta_connection(uuid,uuid,uuid)'] LOOP
  IF to_regprocedure(signature) IS NULL THEN RAISE EXCEPTION 'META_SOCIAL_PREREQUISITE_MISSING'; END IF;
 END LOOP;
 IF to_regclass('public.usuario_empresas_acceso') IS NULL THEN
  RAISE EXCEPTION 'META_COMPANY_ACCESS_PREREQUISITE_MISSING'; END IF;
 IF EXISTS(SELECT 1 FROM public.sales_social_integrations WHERE provider_code='META') THEN
  RAISE EXCEPTION 'META_LEGACY_CONNECTION_REVIEW_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM public.sales_social_webhook_receipts r
  LEFT JOIN public.sales_social_assets a ON a.id=r.asset_id AND a.organization_id=r.organization_id
  WHERE a.id IS NULL) THEN RAISE EXCEPTION 'META_RECEIPT_ASSET_MISMATCH'; END IF;
 IF EXISTS(SELECT 1 FROM pg_class c WHERE c.relnamespace='public'::regnamespace
  AND c.relname IN ('sales_social_integrations','sales_social_accounts','sales_social_assets',
   'sales_social_oauth_states','sales_social_webhook_receipts') AND NOT c.relrowsecurity) THEN
  RAISE EXCEPTION 'META_EXISTING_RLS_REQUIRED'; END IF;
END $$;
SELECT 'PASS: prerequisites and legacy-data checks; no changes applied' AS result;
ROLLBACK;
