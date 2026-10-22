-- Review-only rollback for the isolated retry function. Does not touch rows.
-- Apply only through the protected Production migration process.
CREATE OR REPLACE FUNCTION public.native_sales_patient_email_finish(
  p_id uuid,p_outcome text,p_provider_id text DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_status text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'PATIENT_EMAIL_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  IF p_outcome IS NULL OR p_outcome NOT IN ('SENT','FAILED','UNKNOWN') OR
     length(coalesce(p_provider_id,''))>240 THEN
    RAISE EXCEPTION 'PATIENT_EMAIL_INVALID' USING ERRCODE='22023';
  END IF;
  UPDATE public.sales_patient_email_outbox SET
    status=CASE WHEN p_outcome='FAILED' AND attempts<5 THEN 'RETRY' ELSE p_outcome END,
    next_attempt_at=CASE WHEN p_outcome='FAILED' AND attempts<5 THEN
      now()+make_interval(mins=>LEAST(60,2^LEAST(attempts,6))::integer)
      ELSE next_attempt_at END,
    provider_id=CASE WHEN p_outcome='SENT' THEN p_provider_id ELSE provider_id END,
    sent_at=CASE WHEN p_outcome='SENT' THEN now() ELSE sent_at END,
    updated_at=now()
    WHERE id=p_id AND status='SENDING' RETURNING status INTO v_status;
  RETURN v_status;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_patient_email_finish(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_email_finish(uuid,text,text) TO service_role;
