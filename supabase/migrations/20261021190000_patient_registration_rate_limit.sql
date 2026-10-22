-- Patient Portal signup admission is service-only and independent of staff Auth.
-- Store digests rather than raw email addresses or IPs; no existing rows change.
CREATE TABLE public.sales_patient_registration_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email_digest text NOT NULL CHECK (email_digest ~ '^[a-f0-9]{64}$'),
  ip_digest text CHECK (ip_digest ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sales_patient_registration_email_window_idx
  ON public.sales_patient_registration_attempts(email_digest, created_at DESC);
CREATE INDEX sales_patient_registration_ip_window_idx
  ON public.sales_patient_registration_attempts(ip_digest, created_at DESC)
  WHERE ip_digest IS NOT NULL;
ALTER TABLE public.sales_patient_registration_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sales_patient_registration_attempts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.sales_patient_registration_attempts TO service_role;
GRANT USAGE ON SEQUENCE public.sales_patient_registration_attempts_id_seq TO service_role;

CREATE FUNCTION public.native_sales_patient_registration_admit(
  p_email_digest text, p_ip_digest text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_now timestamptz := clock_timestamp();
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'PATIENT_REGISTRATION_FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF p_email_digest IS NULL OR p_email_digest !~ '^[a-f0-9]{64}$' OR
    (p_ip_digest IS NOT NULL AND p_ip_digest !~ '^[a-f0-9]{64}$') THEN
    RAISE EXCEPTION 'PATIENT_REGISTRATION_INVALID' USING ERRCODE = '22023';
  END IF;
  -- Serialise admission across instances, including simultaneous different emails
  -- from the same source. The critical section contains only indexed counts/insert.
  PERFORM pg_advisory_xact_lock(21001021);
  IF (SELECT count(*) FROM public.sales_patient_registration_attempts
      WHERE email_digest = p_email_digest AND created_at > v_now - interval '1 hour') >= 3 OR
     (SELECT count(*) FROM public.sales_patient_registration_attempts
      WHERE email_digest = p_email_digest AND created_at > v_now - interval '1 day') >= 5 OR
     (p_ip_digest IS NOT NULL AND (SELECT count(*) FROM public.sales_patient_registration_attempts
      WHERE ip_digest = p_ip_digest AND created_at > v_now - interval '1 hour') >= 20) THEN
    RETURN false;
  END IF;
  INSERT INTO public.sales_patient_registration_attempts(email_digest, ip_digest, created_at)
    VALUES (p_email_digest, p_ip_digest, v_now);
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_patient_registration_admit(text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_registration_admit(text,text) TO service_role;

-- Only accounts created by this Portal's controlled signup path may receive a
-- new patient-branded link. This excludes existing staff Auth identities.
CREATE FUNCTION public.native_sales_patient_registration_can_recover(p_email text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'PATIENT_REGISTRATION_FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF p_email IS NULL OR length(p_email) NOT BETWEEN 3 AND 320 THEN
    RAISE EXCEPTION 'PATIENT_REGISTRATION_INVALID' USING ERRCODE = '22023';
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM auth.users AS u
    WHERE lower(u.email) = lower(btrim(p_email))
      AND u.email_confirmed_at IS NULL
      AND u.raw_user_meta_data @> '{"corazon_patient_signup": true}'::jsonb
      AND NOT EXISTS (SELECT 1 FROM public.usuarios AS staff WHERE staff.auth_id = u.id)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_patient_registration_can_recover(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_registration_can_recover(text) TO service_role;
