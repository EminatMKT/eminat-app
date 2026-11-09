\set ON_ERROR_STOP on
-- Reviewed rollback for 20261022230000 only. Never run against an active OAuth
-- connection. Execute solely through an approved maintenance workflow.
BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.sales_qbo_oauth_states)
    OR EXISTS (SELECT 1 FROM public.sales_qbo_connections
      WHERE environment='production' AND
        (access_token_ciphertext IS NOT NULL OR refresh_token_ciphertext IS NOT NULL
          OR refresh_claim_id IS NOT NULL)) THEN
    RAISE EXCEPTION 'QBO_OAUTH_ROLLBACK_REQUIRES_DISCONNECTED_EMPTY_STATE';
  END IF;
END $$;
DROP FUNCTION public.native_sales_qbo_disconnect(uuid,uuid);
DROP FUNCTION public.native_sales_qbo_hold_for_revocation(uuid,uuid);
DROP FUNCTION public.native_sales_qbo_finish_refresh(uuid,uuid,text,text,timestamptz,timestamptz);
DROP FUNCTION public.native_sales_qbo_claim_refresh(uuid,uuid);
DROP FUNCTION public.native_sales_qbo_finish_oauth_state(uuid,uuid,uuid,text,text,text,timestamptz,timestamptz);
DROP FUNCTION public.native_sales_qbo_claim_oauth_state(text,uuid,uuid);
DROP TABLE public.sales_qbo_oauth_states;
ALTER TABLE public.sales_qbo_connections
  DROP COLUMN refresh_claim_id,
  DROP COLUMN refresh_claim_expires_at;
DROP INDEX public.sales_patient_qbo_invoice_reference_unique;
DELETE FROM supabase_migrations.schema_migrations
  WHERE version='20261022230000';
COMMIT;
