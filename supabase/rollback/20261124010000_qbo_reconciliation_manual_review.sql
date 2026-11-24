BEGIN;
LOCK TABLE public.sales_qbo_webhook_events IN SHARE ROW EXCLUSIVE MODE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.sales_qbo_webhook_events WHERE status='MANUAL_REVIEW') THEN
 RAISE EXCEPTION 'QBO_REVIEW_ROLLBACK_REQUIRES_RESOLUTION'; END IF;
END $$;
DROP FUNCTION public.native_sales_qbo_require_review(uuid,text,uuid,integer,text,jsonb);
ALTER TABLE public.sales_qbo_webhook_events DROP CONSTRAINT sales_qbo_webhook_review_consistency;
ALTER TABLE public.sales_qbo_webhook_events DROP CONSTRAINT sales_qbo_webhook_events_status_check;
ALTER TABLE public.sales_qbo_webhook_events ADD CONSTRAINT sales_qbo_webhook_events_status_check
 CHECK(status IN ('PENDING','PROCESSED','RETRY','IGNORED'));
ALTER TABLE public.sales_qbo_webhook_events DROP COLUMN review_reason,DROP COLUMN review_required_at;
COMMIT;
