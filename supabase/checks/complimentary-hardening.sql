BEGIN READ ONLY;
SELECT count(*) AS custom_pending_policy FROM public.sales_complimentary_custom_requests WHERE status='PENDING_POLICY';
SELECT count(*) AS reactivations FROM public.sales_complimentary_events WHERE action='REACTIVATE';
SELECT tgname,pg_get_triggerdef(oid) FROM pg_trigger WHERE tgrelid='public.sales_memberships'::regclass AND NOT tgisinternal;
ROLLBACK;
