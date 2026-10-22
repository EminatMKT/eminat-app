-- Dedicated, service-only Patient Portal email outbox. Verification links are
-- encrypted by the application before insertion and never appear in audit logs.
CREATE TABLE public.sales_patient_email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('verification','welcome','invoice','activation')),
  event_id text NOT NULL CHECK (event_id ~ '^[A-Za-z0-9-]{8,128}$'),
  recipient text NOT NULL CHECK (length(recipient) BETWEEN 3 AND 320),
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  payload_ciphertext text NOT NULL CHECK (length(payload_ciphertext) BETWEEN 20 AND 100000),
  status text NOT NULL DEFAULT 'QUEUED'
    CHECK (status IN ('QUEUED','SENDING','RETRY','SENT','FAILED','UNKNOWN')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  sent_at timestamptz,
  provider_id text CHECK (length(provider_id) <= 240),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind,event_id)
);
CREATE INDEX sales_patient_email_outbox_due_idx
  ON public.sales_patient_email_outbox(status,next_attempt_at)
  WHERE status IN ('QUEUED','RETRY');
ALTER TABLE public.sales_patient_email_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sales_patient_email_outbox FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.sales_patient_email_outbox TO service_role;

CREATE FUNCTION public.native_sales_patient_email_queue(
  p_kind text,p_event_id text,p_recipient text,p_payload_hash text,p_payload_ciphertext text
) RETURNS public.sales_patient_email_outbox
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_row public.sales_patient_email_outbox%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'PATIENT_EMAIL_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  IF p_kind NOT IN ('verification','welcome','invoice','activation') OR
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

CREATE FUNCTION public.native_sales_patient_email_claim(p_id uuid)
RETURNS public.sales_patient_email_outbox
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_row public.sales_patient_email_outbox%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'PATIENT_EMAIL_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  -- Do not send a confirmation link from a delayed daily retry after its
  -- useful window. The patient can request a fresh branded link instead.
  UPDATE public.sales_patient_email_outbox SET status='FAILED',updated_at=now()
    WHERE id=p_id AND kind='verification' AND status IN ('QUEUED','RETRY')
      AND created_at<now()-interval '2 hours';
  UPDATE public.sales_patient_email_outbox SET status='SENDING',
    attempts=attempts+1,claimed_at=now(),updated_at=now()
    WHERE id=p_id AND status IN ('QUEUED','RETRY') AND next_attempt_at<=now()
      AND attempts<5 RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

CREATE FUNCTION public.native_sales_patient_email_finish(
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

CREATE FUNCTION public.native_sales_patient_email_recover_unknown() RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_count integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'PATIENT_EMAIL_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  -- An interrupted provider call has an ambiguous outcome. Never resend it.
  UPDATE public.sales_patient_email_outbox SET status='UNKNOWN',updated_at=now()
    WHERE status='SENDING' AND claimed_at<now()-interval '10 minutes';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.native_sales_patient_email_queue(text,text,text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.native_sales_patient_email_claim(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.native_sales_patient_email_finish(uuid,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.native_sales_patient_email_recover_unknown() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_email_queue(text,text,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_email_claim(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_email_finish(uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_email_recover_unknown() TO service_role;
