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
