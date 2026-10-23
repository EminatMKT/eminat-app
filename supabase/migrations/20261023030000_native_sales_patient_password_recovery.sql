-- Patient-only password recovery uses the existing encrypted email outbox.
-- No staff identity or existing business row is changed.
ALTER TABLE public.sales_patient_email_outbox
  DROP CONSTRAINT sales_patient_email_outbox_kind_check;
ALTER TABLE public.sales_patient_email_outbox
  ADD CONSTRAINT sales_patient_email_outbox_kind_check
  CHECK (kind IN ('verification','welcome','invoice','activation','recovery'));

CREATE OR REPLACE FUNCTION public.native_sales_patient_email_queue(
  p_kind text,p_event_id text,p_recipient text,p_payload_hash text,p_payload_ciphertext text
) RETURNS public.sales_patient_email_outbox
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_row public.sales_patient_email_outbox%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'PATIENT_EMAIL_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  IF p_kind NOT IN ('verification','welcome','invoice','activation','recovery') OR
     p_event_id IS NULL OR p_event_id !~ '^[A-Za-z0-9-]{8,128}$' OR
     p_recipient IS NULL OR length(p_recipient) NOT BETWEEN 3 AND 320 OR
     p_payload_hash IS NULL OR p_payload_hash !~ '^[a-f0-9]{64}$' OR
     p_payload_ciphertext IS NULL OR length(p_payload_ciphertext) NOT BETWEEN 20 AND 100000 THEN
    RAISE EXCEPTION 'PATIENT_EMAIL_INVALID' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.sales_patient_email_outbox
    (kind,event_id,recipient,payload_hash,payload_ciphertext)
    VALUES (p_kind,p_event_id,lower(btrim(p_recipient)),p_payload_hash,p_payload_ciphertext)
    ON CONFLICT (kind,event_id) DO NOTHING RETURNING * INTO v_row;
  IF NOT FOUND THEN
    SELECT * INTO v_row FROM public.sales_patient_email_outbox
      WHERE kind=p_kind AND event_id=p_event_id;
    IF v_row.recipient IS DISTINCT FROM lower(btrim(p_recipient)) OR
       v_row.payload_hash IS DISTINCT FROM p_payload_hash THEN
      RAISE EXCEPTION 'PATIENT_EMAIL_IDEMPOTENCY_CONFLICT' USING ERRCODE='23505';
    END IF;
  END IF;
  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_patient_email_queue(text,text,text,text,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_email_queue(text,text,text,text,text)
  TO service_role;

-- A patient Auth identity is deliberately marked during Portal signup. Staff
-- identities are excluded, even if they use the same email domain.
CREATE FUNCTION public.native_sales_patient_can_reset_password(p_email text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'PATIENT_RECOVERY_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  IF p_email IS NULL OR length(p_email) NOT BETWEEN 3 AND 320 THEN
    RAISE EXCEPTION 'PATIENT_RECOVERY_INVALID' USING ERRCODE='22023';
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM auth.users AS u
    WHERE lower(u.email)=lower(btrim(p_email))
      AND u.email_confirmed_at IS NOT NULL
      AND u.raw_user_meta_data @> '{"corazon_patient_signup": true}'::jsonb
      AND NOT EXISTS (SELECT 1 FROM public.usuarios staff WHERE staff.auth_id=u.id)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_patient_can_reset_password(text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_can_reset_password(text) TO service_role;
