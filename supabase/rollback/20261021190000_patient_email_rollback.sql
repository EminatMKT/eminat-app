-- Review-only rollback artifact. Never execute outside the protected Production
-- process after BOTH migrations completed. Once any registration or mail row exists, retain the schema and
-- roll back application code instead so the audit trail is not destroyed.
BEGIN;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.sales_patient_registration_attempts LIMIT 1) THEN
    RAISE EXCEPTION 'PATIENT_REGISTRATION_AUDIT_EXISTS';
  END IF;
  IF EXISTS (SELECT 1 FROM public.sales_patient_email_outbox LIMIT 1) THEN
    RAISE EXCEPTION 'PATIENT_EMAIL_AUDIT_EXISTS';
  END IF;
END;
$$;
DROP FUNCTION IF EXISTS public.native_sales_patient_email_recover_unknown();
DROP FUNCTION IF EXISTS public.native_sales_patient_email_finish(uuid,text,text);
DROP FUNCTION IF EXISTS public.native_sales_patient_email_claim(uuid);
DROP FUNCTION IF EXISTS public.native_sales_patient_email_queue(text,text,text,text,text);
DROP FUNCTION IF EXISTS public.native_sales_patient_registration_can_recover(text);
DROP FUNCTION IF EXISTS public.native_sales_patient_registration_admit(text,text);
DROP TABLE IF EXISTS public.sales_patient_email_outbox;
DROP TABLE IF EXISTS public.sales_patient_registration_attempts;
COMMIT;
