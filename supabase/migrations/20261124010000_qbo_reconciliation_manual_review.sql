-- Additive queue metadata only. Financial evidence and memberships are unchanged.
BEGIN;
ALTER TABLE public.sales_qbo_webhook_events
 ADD COLUMN review_reason text,
 ADD COLUMN review_required_at timestamptz;
ALTER TABLE public.sales_qbo_webhook_events DROP CONSTRAINT sales_qbo_webhook_events_status_check;
ALTER TABLE public.sales_qbo_webhook_events ADD CONSTRAINT sales_qbo_webhook_events_status_check
 CHECK(status IN ('PENDING','PROCESSED','RETRY','IGNORED','MANUAL_REVIEW'));
ALTER TABLE public.sales_qbo_webhook_events ADD CONSTRAINT sales_qbo_webhook_review_consistency
 CHECK((status='MANUAL_REVIEW' AND review_reason IS NOT NULL AND review_required_at IS NOT NULL)
 OR (status<>'MANUAL_REVIEW' AND review_reason IS NULL AND review_required_at IS NULL));
CREATE FUNCTION public.native_sales_qbo_require_review(
 p_organization_id uuid,p_environment text,p_event_id uuid,p_expected_attempts integer,
 p_reason text,p_evidence jsonb
) RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=public,pg_temp AS $$
DECLARE e public.sales_qbo_webhook_events%ROWTYPE;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'QBO_SERVER_ONLY' USING ERRCODE='42501'; END IF;
 IF p_organization_id IS NULL OR p_environment IS NULL OR p_environment NOT IN ('sandbox','production')
 OR p_event_id IS NULL OR p_expected_attempts IS NULL OR p_expected_attempts<1
 OR p_reason IS NULL OR p_reason NOT IN ('UNLINKED_VOIDED_PAYMENT','UNLINKED_PAYMENT',
 'AMBIGUOUS_PAYMENT_INVOICES','PROVIDER_ENTITY_DELETED','INVOICE_EVIDENCE_REQUIRES_REVIEW',
 'PAYMENT_LINKS_UNRESOLVED','PAYMENT_CHANGED_BEFORE_ACTIVATION')
 OR p_evidence IS NULL OR jsonb_typeof(p_evidence)<>'object' OR octet_length(p_evidence::text)>8192
 OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_evidence) AS k(key) WHERE key NOT IN
 ('invoiceId','invoiceIds','membershipId','intentId','paymentId','customerId','paymentTotalCents','invoiceBalanceCents','decisionReason'))
 THEN RAISE EXCEPTION 'QBO_REVIEW_INVALID' USING ERRCODE='22023'; END IF;
 SELECT * INTO e FROM public.sales_qbo_webhook_events WHERE id=p_event_id
 AND organization_id=p_organization_id AND environment=p_environment FOR UPDATE;
 IF NOT FOUND OR e.attempts<>p_expected_attempts THEN RETURN false; END IF;
 IF e.status='MANUAL_REVIEW' THEN RETURN true; END IF;
 IF e.status<>'RETRY' THEN RETURN false; END IF;
 UPDATE public.sales_qbo_webhook_events SET status='MANUAL_REVIEW',review_reason=p_reason,
 review_required_at=now(),processed_at=now() WHERE id=e.id;
 IF NOT EXISTS(SELECT 1 FROM public.sales_history WHERE organization_id=e.organization_id
 AND entity_type='qbo_reconciliation' AND record_id=e.id AND action='qbo_manual_review_required') THEN
  INSERT INTO public.sales_history(organization_id,entity_type,record_id,action,request_id,changes)
  VALUES(e.organization_id,'qbo_reconciliation',e.id,'qbo_manual_review_required',e.id,
    jsonb_build_object('reason',p_reason,'attempt',e.attempts,'environment',e.environment,
    'entityType',e.entity_type,'entityId',e.entity_id,'operation',e.operation,'evidence',p_evidence));
 END IF;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.native_sales_qbo_require_review(uuid,text,uuid,integer,text,jsonb)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_qbo_require_review(uuid,text,uuid,integer,text,jsonb) TO service_role;
COMMIT;
