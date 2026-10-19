-- Service-only, short-leased recovery for signed Meta Lead Ads receipts.
CREATE FUNCTION public.native_sales_claim_social_leads(p_limit integer DEFAULT 10)
RETURNS SETOF jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=public,pg_temp AS $$
DECLARE v_row record;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501'; END IF;
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 25 THEN
    RAISE EXCEPTION 'META_RETRY_LIMIT_INVALID' USING ERRCODE='22023'; END IF;
  FOR v_row IN
    SELECT r.id,r.organization_id,r.asset_id,r.normalized,
      i.id AS integration_id,coalesce(a.token_ciphertext,i.token_ciphertext) AS token_ciphertext,
      coalesce(a.token_expires_at,i.token_expires_at) AS token_expires_at
    FROM public.sales_social_webhook_receipts r
    JOIN public.sales_social_assets a ON a.organization_id=r.organization_id AND a.id=r.asset_id
    JOIN public.sales_social_accounts ac ON ac.organization_id=a.organization_id AND ac.id=a.account_id
    JOIN public.sales_social_integrations i ON i.organization_id=ac.organization_id AND i.id=ac.integration_id
    WHERE r.status='RETRY' AND r.event_kind='leadgen' AND r.error_code IN
      ('LEAD_DATA_PENDING','META_TOKEN_UNAVAILABLE','META_LEAD_FETCH_FAILED','META_LEAD_INVALID')
      AND r.attempts<r.max_attempts AND r.next_retry_at<=now()
      AND a.status='SUBSCRIBED' AND ac.status='ACTIVE' AND i.status='CONNECTED'
    ORDER BY r.next_retry_at,r.received_at LIMIT p_limit FOR UPDATE OF r SKIP LOCKED
  LOOP
    UPDATE public.sales_social_webhook_receipts SET next_retry_at=now()+interval '2 minutes'
      WHERE id=v_row.id;
    RETURN NEXT jsonb_build_object('receiptId',v_row.id,'organizationId',v_row.organization_id,
      'integrationId',v_row.integration_id,'externalLeadId',v_row.normalized->>'externalLeadId',
      'tokenCiphertext',v_row.token_ciphertext,'tokenExpiresAt',v_row.token_expires_at);
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_claim_social_leads(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_claim_social_leads(integer) TO service_role;

CREATE FUNCTION public.native_sales_fail_social_lead(p_receipt_id uuid,p_error_code text)
RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=public,pg_temp AS $$
DECLARE v_receipt public.sales_social_webhook_receipts%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501'; END IF;
  IF p_error_code NOT IN ('META_TOKEN_UNAVAILABLE','META_LEAD_FETCH_FAILED','META_LEAD_INVALID') THEN
    RAISE EXCEPTION 'META_RETRY_ERROR_INVALID' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_receipt FROM public.sales_social_webhook_receipts
    WHERE id=p_receipt_id FOR UPDATE;
  IF NOT FOUND OR v_receipt.status<>'RETRY' OR v_receipt.event_kind<>'leadgen' THEN
    RAISE EXCEPTION 'META_RETRY_UNAVAILABLE' USING ERRCODE='22023'; END IF;
  UPDATE public.sales_social_webhook_receipts
    SET attempts=attempts+1,
      status=CASE WHEN attempts+1>=max_attempts THEN 'FAILED' ELSE 'RETRY' END,
      next_retry_at=CASE WHEN attempts+1>=max_attempts THEN NULL
        ELSE now()+least(interval '1 hour',interval '1 minute' * power(2,least(attempts,6))) END,
      error_code=p_error_code
    WHERE id=p_receipt_id RETURNING * INTO v_receipt;
  RETURN v_receipt.status;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_fail_social_lead(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_fail_social_lead(uuid,text) TO service_role;
