-- Read-only prerequisite and drift check.
DO $$ BEGIN
 IF to_regclass('public.sales_complimentary_benefits') IS NULL OR to_regprocedure('public.native_sales_complimentary_action(uuid,uuid,uuid,text,integer,text,uuid)') IS NULL THEN RAISE EXCEPTION 'COMPLIMENTARY_BASELINE_MISSING'; END IF;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sales_contacts' AND column_name='preferred_language') THEN RAISE EXCEPTION 'LANGUAGE_COLUMN_REQUIRES_RECONCILIATION'; END IF;
END $$;
