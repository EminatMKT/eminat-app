-- Read-only baseline; production execution belongs to the reviewed release process.
DO $$ BEGIN
 IF to_regclass('public.sales_complimentary_benefits') IS NOT NULL THEN RAISE EXCEPTION 'ALREADY_INSTALLED'; END IF;
 IF to_regclass('public.sales_memberships') IS NULL OR to_regclass('public.sales_patient_identities') IS NULL
 OR to_regprocedure('public.native_sales_patient_qbo_membership_guard()') IS NULL
 OR to_regprocedure('public.native_sales_membership_quote(text,text,text)') IS NULL THEN RAISE EXCEPTION 'BASELINE_MISSING'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.sales_memberships'::regclass AND contype='c'
 AND pg_get_constraintdef(oid) LIKE '%sales_payment_id IS NOT NULL%') THEN RAISE EXCEPTION 'PAYMENT_GUARD_DRIFT'; END IF;
END $$;
SELECT count(*) AS memberships_before,count(*) FILTER(WHERE status='ACTIVE') AS active_before,
 coalesce(sum(amount),0) AS recorded_amount_before FROM public.sales_memberships;
SELECT tgname,pg_get_triggerdef(oid) FROM pg_trigger WHERE tgrelid='public.sales_memberships'::regclass AND NOT tgisinternal;
