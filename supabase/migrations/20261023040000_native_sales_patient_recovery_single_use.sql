-- A verified recovery link may change a patient password only once. Keep only
-- a digest of the high-entropy token; the token itself is never stored here.
CREATE TABLE public.sales_patient_recovery_token_claims (
  token_digest text PRIMARY KEY CHECK (token_digest ~ '^[a-f0-9]{64}$'),
  auth_id uuid NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sales_patient_recovery_token_claims_auth_idx
  ON public.sales_patient_recovery_token_claims(auth_id, claimed_at DESC);
ALTER TABLE public.sales_patient_recovery_token_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sales_patient_recovery_token_claims FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.native_sales_patient_claim_recovery_token(
  p_token_digest text, p_auth_id uuid
) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'PATIENT_RECOVERY_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  IF p_token_digest IS NULL OR p_token_digest !~ '^[a-f0-9]{64}$' OR
     p_auth_id IS NULL THEN
    RAISE EXCEPTION 'PATIENT_RECOVERY_INVALID' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.sales_patient_recovery_token_claims(token_digest, auth_id)
    VALUES (p_token_digest, p_auth_id)
    ON CONFLICT (token_digest) DO NOTHING;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_patient_claim_recovery_token(text,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_claim_recovery_token(text,uuid)
  TO service_role;

-- Ordinary signup admission remains unchanged. For password recovery only,
-- suppress immediate repeats before they generate another link or email.
CREATE FUNCTION public.native_sales_patient_recovery_admit(
  p_email_digest text, p_ip_digest text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'PATIENT_RECOVERY_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  IF p_email_digest IS NULL OR p_email_digest !~ '^[a-f0-9]{64}$' OR
     (p_ip_digest IS NOT NULL AND p_ip_digest !~ '^[a-f0-9]{64}$') THEN
    RAISE EXCEPTION 'PATIENT_RECOVERY_INVALID' USING ERRCODE='22023';
  END IF;
  -- Use the admission function's lock so the cooldown check and insert are
  -- atomic even when two requests reach separate runtime instances together.
  PERFORM pg_advisory_xact_lock(21001021);
  IF EXISTS (SELECT 1 FROM public.sales_patient_registration_attempts
      WHERE email_digest=p_email_digest AND created_at>clock_timestamp()-interval '2 minutes') THEN
    RETURN false;
  END IF;
  RETURN public.native_sales_patient_registration_admit(p_email_digest,p_ip_digest);
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_patient_recovery_admit(text,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_recovery_admit(text,text)
  TO service_role;
