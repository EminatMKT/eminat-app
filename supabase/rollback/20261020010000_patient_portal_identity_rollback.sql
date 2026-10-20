-- Prelaunch rollback only. Refuses to remove any patient or Sales records.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.sales_patient_identities) OR
     EXISTS (SELECT 1 FROM public.sales_patient_sessions) OR
     EXISTS (SELECT 1 FROM public.sales_patient_enrollment_intents) OR
     EXISTS (SELECT 1 FROM public.sales_contacts
       WHERE organization_id = '9efab353-46a0-43d1-9901-e3f185dc5d30') THEN
    RAISE EXCEPTION 'PATIENT_ROLLBACK_REQUIRES_OWNER_REVIEW';
  END IF;
END $$;

DROP FUNCTION public.native_sales_patient_claim_contact(uuid,text,text,text,text,uuid,uuid);
DROP TABLE public.sales_patient_enrollment_intents;
DROP TABLE public.sales_patient_sessions;
DROP TABLE public.sales_patient_identities;
DROP INDEX public.sales_patient_self_registration_email_unique;
DELETE FROM public.sales_members
  WHERE id = 'c67e9779-9e87-48b0-9f6c-bf6a0c8cebad'
    AND organization_id = '9efab353-46a0-43d1-9901-e3f185dc5d30'
    AND status = 'pending' AND evidence_ref = 'owner-approved-emc-patient-fallback-2026-10-20';
DELETE FROM public.sales_organizations
  WHERE id = '9efab353-46a0-43d1-9901-e3f185dc5d30'
    AND code = 'emc' AND name = 'Eminat Medical Center';
