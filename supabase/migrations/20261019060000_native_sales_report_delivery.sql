-- Durable, one-claim report delivery. Unknown provider outcomes never auto-retry.
CREATE FUNCTION public.native_sales_claim_due_reports(
  p_now timestamptz,p_limit integer DEFAULT 25
) RETURNS SETOF jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501'; END IF;
  IF p_now IS NULL OR p_limit NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE='22023'; END IF;
  INSERT INTO public.sales_report_deliveries
    (organization_id,schedule_id,recipient_member_id,period_key,status,report_path)
  SELECT s.organization_id,s.id,m.id,
    ((p_now AT TIME ZONE s.timezone)::date-1)::text,'PENDING','/sales'
  FROM public.sales_report_schedules s
  JOIN public.sales_organizations o ON o.id=s.organization_id AND o.status='active'
  JOIN public.sales_members m ON m.organization_id=s.organization_id AND m.status='active'
    AND m.role=ANY(s.recipient_roles)
  JOIN public.usuarios u ON u.id=m.user_id AND u.activo=true
  WHERE s.enabled AND s.report_code='SALES_SUMMARY' AND s.timezone='America/Guayaquil'
    AND extract(hour FROM p_now AT TIME ZONE s.timezone)>=8
    AND (s.cadence='DAILY' OR (s.cadence='WEEKLY' AND
      extract(isodow FROM p_now AT TIME ZONE s.timezone)=1))
    AND u.email IS NOT NULL AND u.email ~* '^[^@ ]+@[^@ ]+\.[^@ ]+$'
  ON CONFLICT (organization_id,schedule_id,recipient_member_id,period_key) DO NOTHING;
  UPDATE public.sales_report_deliveries d SET status='FAILED',error_code='RECIPIENT_OR_SCHEDULE_INACTIVE'
    WHERE d.status='PENDING' AND d.claim_id IS NULL AND NOT EXISTS (
      SELECT 1 FROM public.sales_report_schedules s
      JOIN public.sales_members m ON m.organization_id=s.organization_id
        AND m.id=d.recipient_member_id AND m.status='active' AND m.role=ANY(s.recipient_roles)
      JOIN public.usuarios u ON u.id=m.user_id AND u.activo=true
      WHERE s.organization_id=d.organization_id AND s.id=d.schedule_id AND s.enabled
        AND u.email ~* '^[^@ ]+@[^@ ]+\.[^@ ]+$'
    );
  RETURN QUERY WITH candidates AS (
    SELECT d.id FROM public.sales_report_deliveries d
    JOIN public.sales_report_schedules s ON s.organization_id=d.organization_id AND s.id=d.schedule_id
    JOIN public.sales_members m ON m.organization_id=d.organization_id AND m.id=d.recipient_member_id
    JOIN public.usuarios u ON u.id=m.user_id
    WHERE d.status='PENDING' AND d.claim_id IS NULL AND s.enabled
      AND m.status='active' AND m.role=ANY(s.recipient_roles) AND u.activo=true
      AND u.email ~* '^[^@ ]+@[^@ ]+\.[^@ ]+$'
    ORDER BY d.created_at,d.id LIMIT p_limit FOR UPDATE SKIP LOCKED
  ), claimed AS (
    UPDATE public.sales_report_deliveries d SET claim_id=gen_random_uuid(),claimed_at=p_now
    WHERE d.id IN (SELECT id FROM candidates) RETURNING d.*
  ) SELECT jsonb_build_object(
      'id',d.id,'claimId',d.claim_id,'organizationId',d.organization_id,
      'scheduleId',d.schedule_id,'recipientMemberId',d.recipient_member_id,
      'recipientEmail',u.email,'periodFrom',CASE WHEN s.cadence='WEEKLY'
        THEN (d.period_key::date-6)::text ELSE d.period_key END,
      'periodTo',d.period_key,'cadence',s.cadence,'reportPath',d.report_path)
    FROM claimed d
    JOIN public.sales_report_schedules s ON s.organization_id=d.organization_id AND s.id=d.schedule_id
    JOIN public.sales_members m ON m.organization_id=d.organization_id AND m.id=d.recipient_member_id
    JOIN public.usuarios u ON u.id=m.user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_claim_due_reports(timestamptz,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_claim_due_reports(timestamptz,integer) TO service_role;

CREATE FUNCTION public.native_sales_finish_report_delivery(
  p_delivery_id uuid,p_claim_id uuid,p_status text,p_provider_message_id text,p_error_code text
) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_delivery public.sales_report_deliveries%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501'; END IF;
  IF p_claim_id IS NULL OR p_status NOT IN ('SENT','FAILED') OR
    (p_status='SENT' AND length(coalesce(p_provider_message_id,''))=0) OR
    (p_status='FAILED' AND length(coalesce(p_error_code,''))=0) OR
    length(coalesce(p_provider_message_id,''))>500 OR length(coalesce(p_error_code,''))>100 THEN
    RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE='22023';
  END IF;
  UPDATE public.sales_report_deliveries SET status=p_status,
    provider_message_id=CASE WHEN p_status='SENT' THEN p_provider_message_id ELSE NULL END,
    error_code=CASE WHEN p_status='FAILED' THEN p_error_code ELSE NULL END,
    sent_at=CASE WHEN p_status='SENT' THEN now() ELSE NULL END
    WHERE id=p_delivery_id AND claim_id=p_claim_id AND status='PENDING' RETURNING * INTO v_delivery;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.sales_report_schedules SET last_run_at=now(),last_status=p_status,
    last_error_code=CASE WHEN p_status='FAILED' THEN p_error_code ELSE NULL END,
    updated_at=now()
    WHERE organization_id=v_delivery.organization_id AND id=v_delivery.schedule_id;
  INSERT INTO public.sales_history(organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
    VALUES (v_delivery.organization_id,'report_schedule',v_delivery.schedule_id,NULL,
      CASE WHEN p_status='SENT' THEN 'delivery.sent' ELSE 'delivery.failed' END,
      p_claim_id,jsonb_build_object('recipientMemberId',v_delivery.recipient_member_id,
        'periodKey',v_delivery.period_key,'errorCode',p_error_code));
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_finish_report_delivery(uuid,uuid,text,text,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_finish_report_delivery(uuid,uuid,text,text,text)
  TO service_role;
