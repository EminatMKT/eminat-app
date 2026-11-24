DO $$ BEGIN
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.sales_qbo_webhook_events'::regclass)
 OR has_function_privilege('anon','public.native_sales_qbo_require_review(uuid,text,uuid,integer,text,jsonb)','EXECUTE')
 OR has_function_privilege('authenticated','public.native_sales_qbo_require_review(uuid,text,uuid,integer,text,jsonb)','EXECUTE')
 OR NOT has_function_privilege('service_role','public.native_sales_qbo_require_review(uuid,text,uuid,integer,text,jsonb)','EXECUTE')
 THEN RAISE EXCEPTION 'QBO_REVIEW_ACCESS_INVALID'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.sales_qbo_webhook_events'::regclass
 AND conname='sales_qbo_webhook_review_consistency' AND convalidated) THEN
 RAISE EXCEPTION 'QBO_REVIEW_CONSISTENCY_REQUIRED'; END IF;
END $$;
