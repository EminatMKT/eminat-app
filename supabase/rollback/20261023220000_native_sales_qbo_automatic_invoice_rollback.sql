-- Emergency schema rollback, only after restoring the previous runtime.
-- Refuse to erase any attempted QBO Customer/Invoice or local audit history.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.sales_qbo_invoice_jobs) OR
    EXISTS (SELECT 1 FROM public.sales_qbo_customer_bindings) OR
    EXISTS (SELECT 1 FROM public.sales_patient_qbo_manual
      WHERE integration_mode='AUTO_QBO') THEN
    RAISE EXCEPTION 'AUTO_QBO_HISTORY_REQUIRES_RECONCILIATION';
  END IF;
END;
$$;
DROP TRIGGER sales_qbo_invoice_mapping_guard ON public.sales_patient_qbo_manual;
DROP FUNCTION public.native_sales_qbo_invoice_mapping_guard();
DROP TRIGGER sales_qbo_invoice_selection_guard ON public.sales_patient_enrollment_intents;
DROP FUNCTION public.native_sales_qbo_invoice_selection_guard();
DROP FUNCTION public.native_sales_qbo_finish_invoice(uuid,text,text,text,text,text);
DROP FUNCTION public.native_sales_qbo_claim_invoice(uuid,uuid);
DROP TRIGGER sales_qbo_invoice_job_audit ON public.sales_qbo_invoice_jobs;
DROP FUNCTION public.native_sales_qbo_invoice_job_audit();
DROP TABLE public.sales_qbo_invoice_job_events;
DROP TABLE public.sales_qbo_customer_bindings;
DROP TABLE public.sales_qbo_invoice_jobs;
ALTER TABLE public.sales_patient_qbo_manual
  DROP CONSTRAINT sales_patient_qbo_manual_integration_mode_check;
ALTER TABLE public.sales_patient_qbo_manual
  ADD CONSTRAINT sales_patient_qbo_manual_integration_mode_check
  CHECK (integration_mode='MANUAL_QBO_VERIFICATION');
