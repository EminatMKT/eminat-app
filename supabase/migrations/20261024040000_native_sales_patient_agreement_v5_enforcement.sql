-- Activate v5 invoice enforcement only after both runtimes persist acceptance.
CREATE FUNCTION public.native_sales_qbo_agreement_gate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  -- ON CONFLICT DO NOTHING still executes BEFORE INSERT triggers. An existing
  -- job predating v5 must be recoverable without fabricating past acceptance.
  IF TG_OP='UPDATE' AND
    (NEW.state IS DISTINCT FROM 'INVOICE_WRITE_STARTED' OR
     OLD.state='INVOICE_WRITE_STARTED') THEN RETURN NEW; END IF;
  IF TG_OP='INSERT' AND EXISTS (SELECT 1 FROM public.sales_qbo_invoice_jobs j
      WHERE j.organization_id=NEW.organization_id
        AND j.enrollment_intent_id=NEW.enrollment_intent_id) THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sales_patient_agreement_acceptances a
      WHERE a.organization_id=NEW.organization_id
        AND a.enrollment_intent_id=NEW.enrollment_intent_id
        AND a.patient_identity_id=NEW.patient_identity_id
        AND a.contact_id=NEW.contact_id AND a.opportunity_id=NEW.opportunity_id
        AND a.agreement_version='v5' AND a.plan=NEW.plan
        AND a.membership_type=NEW.membership_type AND a.duration=NEW.duration
        AND a.amount_cents=NEW.amount_cents) THEN
    RAISE EXCEPTION 'PATIENT_AGREEMENT_REQUIRED' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER sales_qbo_invoice_agreement_gate BEFORE INSERT OR UPDATE
  ON public.sales_qbo_invoice_jobs FOR EACH ROW
  EXECUTE FUNCTION public.native_sales_qbo_agreement_gate();
REVOKE ALL ON FUNCTION public.native_sales_qbo_agreement_gate()
  FROM PUBLIC,anon,authenticated;
