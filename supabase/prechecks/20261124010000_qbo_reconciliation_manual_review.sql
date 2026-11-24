DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.sales_qbo_webhook_events'::regclass
 AND conname='sales_qbo_webhook_events_status_check') THEN RAISE EXCEPTION 'QBO_STATUS_CONSTRAINT_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public'
 AND table_name='sales_qbo_webhook_events' AND column_name IN ('review_reason','review_required_at'))
 OR EXISTS(SELECT 1 FROM public.sales_qbo_webhook_events WHERE status NOT IN ('PENDING','PROCESSED','RETRY','IGNORED'))
 THEN RAISE EXCEPTION 'QBO_REVIEW_SCHEMA_DRIFT'; END IF;
END $$;
