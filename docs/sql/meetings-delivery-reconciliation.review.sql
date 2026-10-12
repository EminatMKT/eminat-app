-- REVIEW ONLY; not a migration. No execution against Supabase or Production.
-- Requires Meetings outbox draft and existing task_email_outbox.
-- Polling reuses RESEND_API_KEY; no webhook endpoint or new provider credential.
CREATE TABLE public.meeting_notification_delivery_state (
 source text NOT NULL CHECK(source IN ('meeting','task')),
 delivery_id uuid NOT NULL,
 provider_message_id text NOT NULL,
 state text NOT NULL CHECK(state IN ('accepted','delivered','bounced','failed','complained')),
 provider_event text NOT NULL,
 checked_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(source,delivery_id)
);
CREATE TABLE public.meeting_notification_delivery_log (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 source text NOT NULL, delivery_id uuid NOT NULL, provider_message_id text NOT NULL,
 state text NOT NULL, provider_event text NOT NULL, observed_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(source,delivery_id,provider_message_id,provider_event)
);
ALTER TABLE public.meeting_notification_delivery_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_notification_delivery_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.meeting_notification_delivery_state,public.meeting_notification_delivery_log FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.meeting_notification_delivery_state,public.meeting_notification_delivery_log TO service_role;

CREATE FUNCTION public.list_meeting_notification_reconciliation(p_limit int DEFAULT 25)
RETURNS TABLE(source text,delivery_id uuid,provider_message_id text)
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 WITH candidates AS (
  SELECT 'meeting'::text source,d.id delivery_id,d.provider_message_id,d.accepted_at accepted_at
  FROM public.meeting_mail_deliveries d WHERE d.status='accepted'
  UNION ALL
  SELECT 'task'::text,t.id,t.provider_message_id,t.sent_at
  FROM public.task_email_outbox t WHERE t.status='sent'
 ) SELECT c.source,c.delivery_id,c.provider_message_id FROM candidates c
 LEFT JOIN public.meeting_notification_delivery_state s USING(source,delivery_id)
 WHERE c.provider_message_id IS NOT NULL AND c.accepted_at > now()-interval '7 days'
  AND (s.checked_at IS NULL OR s.checked_at < now()-interval '5 minutes')
  AND (s.state IS NULL OR s.state NOT IN ('bounced','failed','complained'))
 ORDER BY s.checked_at NULLS FIRST,c.accepted_at,c.delivery_id LIMIT LEAST(GREATEST(p_limit,1),25);
$$;
REVOKE ALL ON FUNCTION public.list_meeting_notification_reconciliation(int) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.list_meeting_notification_reconciliation(int) TO service_role;

CREATE FUNCTION public.record_meeting_notification_delivery(p_source text,p_delivery_id uuid,p_provider_id text,p_state text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actual_id text; mapped text; prior public.meeting_notification_delivery_state;
BEGIN
 IF p_source='meeting' THEN
  SELECT provider_message_id INTO actual_id FROM public.meeting_mail_deliveries WHERE id=p_delivery_id AND status='accepted' FOR UPDATE;
 ELSIF p_source='task' THEN
  SELECT provider_message_id INTO actual_id FROM public.task_email_outbox WHERE id=p_delivery_id AND status='sent' FOR UPDATE;
 ELSE RAISE EXCEPTION 'Invalid source'; END IF;
 IF actual_id IS NULL OR actual_id IS DISTINCT FROM p_provider_id THEN RETURN false; END IF;
 IF p_state NOT IN ('sent','queued','scheduled','delivery_delayed','delivered','opened','clicked','bounced','failed','canceled','suppressed','complained') THEN RAISE EXCEPTION 'Invalid provider event'; END IF;
 mapped:=CASE WHEN p_state IN ('delivered','opened','clicked') THEN 'delivered'
  WHEN p_state='bounced' THEN 'bounced' WHEN p_state='complained' THEN 'complained'
  WHEN p_state IN ('failed','canceled','suppressed') THEN 'failed' ELSE 'accepted' END;
 SELECT * INTO prior FROM public.meeting_notification_delivery_state WHERE source=p_source AND delivery_id=p_delivery_id FOR UPDATE;
 -- Late/parallel observations must never reopen a bounce or downgrade delivery.
 IF prior.state IN ('bounced','failed','complained') THEN mapped:=prior.state;
 ELSIF prior.state='delivered' AND mapped='accepted' THEN mapped:='delivered'; END IF;
 INSERT INTO public.meeting_notification_delivery_log(source,delivery_id,provider_message_id,state,provider_event)
 VALUES(p_source,p_delivery_id,p_provider_id,mapped,p_state) ON CONFLICT DO NOTHING;
 INSERT INTO public.meeting_notification_delivery_state(source,delivery_id,provider_message_id,state,provider_event)
 VALUES(p_source,p_delivery_id,p_provider_id,mapped,p_state)
 ON CONFLICT(source,delivery_id) DO UPDATE SET state=excluded.state,provider_event=excluded.provider_event,checked_at=now();
 -- Outbox acceptance is unchanged: bounced/failed never become sendable again.
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.record_meeting_notification_delivery(text,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_meeting_notification_delivery(text,uuid,text,text) TO service_role;
