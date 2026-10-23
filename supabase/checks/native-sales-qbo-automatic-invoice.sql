DO $$
BEGIN
  IF to_regclass('public.sales_qbo_invoice_jobs') IS NULL
    OR to_regclass('public.sales_qbo_customer_bindings') IS NULL
    OR to_regclass('public.sales_qbo_invoice_job_events') IS NULL
    OR to_regprocedure('public.native_sales_qbo_claim_invoice(uuid,uuid)') IS NULL
    OR to_regprocedure('public.native_sales_qbo_finish_invoice(uuid,text,text,text,text,text)') IS NULL
    OR NOT EXISTS (SELECT 1 FROM pg_constraint
      WHERE conname='sales_qbo_invoice_jobs_organization_id_enrollment_intent_id_key')
    OR NOT EXISTS (SELECT 1 FROM pg_constraint
      WHERE conname='sales_qbo_customer_bindings_organization_id_qbo_customer_id_key')
    OR has_table_privilege('authenticated','public.sales_qbo_invoice_jobs','SELECT')
    OR has_table_privilege('authenticated','public.sales_qbo_customer_bindings','INSERT')
    OR has_function_privilege('authenticated',
      'public.native_sales_qbo_finish_invoice(uuid,text,text,text,text,text)','EXECUTE') THEN
    RAISE EXCEPTION 'AUTO_QBO_SCHEMA_SAFETY_FAILED';
  END IF;
END;
$$;
