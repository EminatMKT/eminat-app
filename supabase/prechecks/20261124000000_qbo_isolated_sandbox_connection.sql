-- Read-only; execute only through the reviewed release process.
DO $$ BEGIN
 IF to_regclass('public.sales_qbo_sandbox_oauth_states') IS NOT NULL THEN RAISE EXCEPTION 'SANDBOX_OAUTH_ALREADY_INSTALLED'; END IF;
 IF to_regclass('public.sales_qbo_connections') IS NULL OR to_regprocedure('public.native_sales_qbo_finish_refresh(uuid,uuid,text,text,timestamptz,timestamptz)') IS NULL THEN RAISE EXCEPTION 'QBO_BASELINE_MISSING'; END IF;
END $$;
