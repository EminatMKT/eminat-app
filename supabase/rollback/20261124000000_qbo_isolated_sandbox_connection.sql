-- Preserve OAuth history and provider grants once the feature has been used.
BEGIN;
DO $stage_guard$ BEGIN
 IF current_setting('lilly.staging_branch_ref',true) IS DISTINCT FROM 'sykxgksagbhmfrzbbtfe' THEN
  RAISE EXCEPTION 'STAGING_DATABASE_ATTESTATION_REQUIRED';
 END IF;
END $stage_guard$;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.sales_qbo_sandbox_oauth_states) OR EXISTS(SELECT 1 FROM public.sales_qbo_connections WHERE environment='sandbox') THEN RAISE EXCEPTION 'PRESERVE_SANDBOX_OAUTH_HISTORY_USE_APPLICATION_ROLLBACK'; END IF;
END $$;
DROP FUNCTION public.native_sales_qbo_sandbox_disconnect(uuid,uuid);
DROP FUNCTION public.native_sales_qbo_sandbox_hold_for_revocation(uuid,uuid);
DROP FUNCTION public.native_sales_qbo_sandbox_finish_refresh(uuid,uuid,text,text,timestamptz,timestamptz);
DROP FUNCTION public.native_sales_qbo_sandbox_claim_refresh(uuid,uuid);
DROP FUNCTION public.native_sales_qbo_sandbox_finish_oauth_state(uuid,uuid,uuid,text,text,text,timestamptz,timestamptz);
DROP FUNCTION public.native_sales_qbo_sandbox_claim_oauth_state(text,uuid,uuid);
DROP TABLE public.sales_qbo_sandbox_oauth_states;
COMMIT;
