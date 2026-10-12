-- REVIEW-ONLY. Not a Supabase migration. Never run against Production in this phase.
-- Requires the existing Meetings schema; no backfill, no updates to historical/business rows.
CREATE TABLE public.meeting_mail_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 meeting_id uuid NOT NULL REFERENCES public.meetings(id),
 event_key text NOT NULL UNIQUE,
 kind text NOT NULL CHECK(kind IN ('created','changed','minutes')),
 payload jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.meeting_mail_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_id uuid NOT NULL REFERENCES public.meeting_mail_events(id),
 email text NOT NULL CHECK(email = lower(btrim(email)) AND email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 name text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','accepted','retry','unknown','dead')),
 attempts int NOT NULL DEFAULT 0,
 next_attempt_at timestamptz DEFAULT now(),
 claimed_at timestamptz, first_claimed_at timestamptz, claim_id uuid,
 provider_message_id text, error text, accepted_at timestamptz,
 UNIQUE(event_id,email),
 CHECK(status <> 'accepted' OR provider_message_id IS NOT NULL)
);
CREATE TABLE public.meeting_mail_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 delivery_id uuid NOT NULL REFERENCES public.meeting_mail_deliveries(id),
 claim_id uuid NOT NULL, outcome text NOT NULL, provider_message_id text, error text,
 occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.meeting_mail_state (
 meeting_id uuid PRIMARY KEY REFERENCES public.meetings(id),
 snapshot jsonb NOT NULL, revision bigint NOT NULL DEFAULT 0
);
CREATE TABLE public.meeting_mail_activation (
 id boolean PRIMARY KEY CHECK(id), enabled_since timestamptz NOT NULL DEFAULT clock_timestamp()
);
INSERT INTO public.meeting_mail_activation(id) VALUES(true);
ALTER TABLE public.meeting_mail_activation ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.meeting_mail_activation FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.meeting_mail_activation TO service_role;
ALTER TABLE public.meeting_mail_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_mail_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_mail_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_mail_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.meeting_mail_events, public.meeting_mail_deliveries, public.meeting_mail_attempts, public.meeting_mail_state FROM PUBLIC, anon, authenticated, service_role;
-- All writes go through the constrained RPCs; provider payloads and audit attempts stay immutable.
GRANT SELECT ON public.meeting_mail_events, public.meeting_mail_deliveries, public.meeting_mail_attempts, public.meeting_mail_state TO service_role;

CREATE FUNCTION public.enqueue_meeting_mail(p_meeting_id uuid,p_key text,p_kind text,p_payload jsonb,p_recipients jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE eid uuid; r jsonb;
BEGIN
 -- Payload is immutable after first insert. Replay appends newly eligible recipients only.
 INSERT INTO public.meeting_mail_events(meeting_id,event_key,kind,payload)
 VALUES(p_meeting_id,p_key,p_kind,p_payload) ON CONFLICT(event_key) DO NOTHING RETURNING id INTO eid;
 IF eid IS NULL THEN
  SELECT id INTO eid FROM public.meeting_mail_events WHERE event_key=p_key AND meeting_id=p_meeting_id AND kind=p_kind;
 END IF;
 IF eid IS NULL THEN RAISE EXCEPTION 'Event key belongs to another meeting/kind'; END IF;
 FOR r IN SELECT value FROM jsonb_array_elements(p_recipients) LOOP
  INSERT INTO public.meeting_mail_deliveries(event_id,email,name)
  VALUES(eid,lower(btrim(r->>'email')),coalesce(r->>'name',''))
  ON CONFLICT(event_id,email) DO NOTHING;
 END LOOP;
 RETURN eid;
END $$;
REVOKE ALL ON FUNCTION public.enqueue_meeting_mail(uuid,text,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_meeting_mail(uuid,text,text,jsonb,jsonb) TO service_role;

CREATE FUNCTION public.claim_meeting_mail(p_event_id uuid DEFAULT NULL,p_limit int DEFAULT 25,p_meeting_id uuid DEFAULT NULL)
RETURNS TABLE(id uuid,claim_id uuid,attempts int,first_claimed_at timestamptz,email text,name text,payload jsonb,kind text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 -- An abandoned/unknown outcome is NEVER automatically resent after key expiration.
 WITH stale AS (
  UPDATE public.meeting_mail_deliveries d SET status='unknown',next_attempt_at=NULL,error='Abandoned claim: reconcile provider before retry'
  WHERE d.status='sending' AND d.claimed_at < now()-interval '10 minutes'
    AND (p_event_id IS NULL OR d.event_id=p_event_id)
    AND (p_meeting_id IS NULL OR d.event_id IN (SELECT e.id FROM public.meeting_mail_events e WHERE e.meeting_id=p_meeting_id)) RETURNING d.*
 ) INSERT INTO public.meeting_mail_attempts(delivery_id,claim_id,outcome,error)
 SELECT s.id,s.claim_id,'unknown',s.error FROM stale s;
 WITH expired AS (
  UPDATE public.meeting_mail_deliveries d SET status='unknown',next_attempt_at=NULL,error='Provider idempotency window expired: reconcile'
  WHERE d.status='retry' AND d.first_claimed_at < now()-interval '23 hours'
    AND (p_event_id IS NULL OR d.event_id=p_event_id)
    AND (p_meeting_id IS NULL OR d.event_id IN (SELECT e.id FROM public.meeting_mail_events e WHERE e.meeting_id=p_meeting_id)) RETURNING d.*
 ) INSERT INTO public.meeting_mail_attempts(delivery_id,claim_id,outcome,error)
 SELECT s.id,s.claim_id,'unknown',s.error FROM expired s;
 RETURN QUERY WITH due AS (
  SELECT d.id FROM public.meeting_mail_deliveries d
  WHERE d.status IN ('pending','retry') AND d.attempts<5 AND d.next_attempt_at<=now()
    AND (p_event_id IS NULL OR d.event_id=p_event_id)
    AND (p_meeting_id IS NULL OR d.event_id IN (SELECT e.id FROM public.meeting_mail_events e WHERE e.meeting_id=p_meeting_id))
  ORDER BY d.next_attempt_at,d.id LIMIT LEAST(GREATEST(p_limit,1),50) FOR UPDATE SKIP LOCKED
 ), claimed AS (
  UPDATE public.meeting_mail_deliveries d SET status='sending',attempts=d.attempts+1,claim_id=gen_random_uuid(),
    claimed_at=now(),first_claimed_at=coalesce(d.first_claimed_at,now()),error=NULL
  FROM due WHERE d.id=due.id RETURNING d.*
 ), logged AS (
  INSERT INTO public.meeting_mail_attempts(delivery_id,claim_id,outcome)
  SELECT c.id,c.claim_id,'claimed' FROM claimed c
 )
 SELECT c.id,c.claim_id,c.attempts,c.first_claimed_at,c.email,c.name,e.payload,e.kind
 FROM claimed c JOIN public.meeting_mail_events e ON e.id=c.event_id;
END $$;
REVOKE ALL ON FUNCTION public.claim_meeting_mail(uuid,int,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_meeting_mail(uuid,int,uuid) TO service_role;

CREATE FUNCTION public.finish_meeting_mail(p_id uuid,p_claim_id uuid,p_outcome text,p_provider_id text DEFAULT NULL,p_error text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.meeting_mail_deliveries; result text;
BEGIN
 SELECT * INTO d FROM public.meeting_mail_deliveries WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR d.status<>'sending' OR d.claim_id IS DISTINCT FROM p_claim_id THEN RETURN false; END IF;
 IF p_outcome NOT IN ('accepted','retry','unknown','dead') THEN RAISE EXCEPTION 'Invalid outcome'; END IF;
 IF p_outcome='accepted' AND nullif(p_provider_id,'') IS NULL THEN RAISE EXCEPTION 'Provider ID required'; END IF;
 result := CASE WHEN p_outcome='retry' AND d.attempts>=5 THEN 'dead' ELSE p_outcome END;
 UPDATE public.meeting_mail_deliveries SET status=result,provider_message_id=p_provider_id,error=left(p_error,500),
  accepted_at=CASE WHEN result='accepted' THEN now() ELSE NULL END,
  next_attempt_at=CASE WHEN result='retry' THEN now()+make_interval(secs=>least(3600,60*power(2,d.attempts)::int)) ELSE NULL END
 WHERE id=p_id;
 INSERT INTO public.meeting_mail_attempts(delivery_id,claim_id,outcome,provider_message_id,error)
 VALUES(p_id,p_claim_id,result,p_provider_id,left(p_error,500));
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.finish_meeting_mail(uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_meeting_mail(uuid,uuid,text,text,text) TO service_role;

CREATE FUNCTION public.meeting_mail_status(p_event_id uuid)
RETURNS TABLE(name text,email text,status text,provider_message_id text,error text)
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 SELECT d.name,d.email,d.status,d.provider_message_id,d.error
 FROM public.meeting_mail_deliveries d WHERE d.event_id=p_event_id ORDER BY d.email;
$$;
REVOKE ALL ON FUNCTION public.meeting_mail_status(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.meeting_mail_status(uuid) TO service_role;

-- Immutable business snapshot for lifecycle mail. Attendance/status are deliberately excluded.
CREATE FUNCTION public.capture_meeting_mail(p_meeting_id uuid,p_create boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE m public.meetings; snap jsonb; recipients jsonb; prior jsonb; rev bigint; kind text; prefix text; message jsonb;
BEGIN
 SELECT * INTO m FROM public.meetings WHERE id=p_meeting_id;
 IF NOT FOUND THEN RETURN; END IF;
 snap := jsonb_build_object('title',m.title,'date',m.meeting_date,'startTime',m.start_time,'endTime',m.end_time,'location',m.location,
   'invitees',coalesce((SELECT jsonb_agg(p.profile_id ORDER BY p.profile_id) FROM public.meeting_participants p WHERE p.meeting_id=m.id),'[]'::jsonb),
   'inviteeNames',coalesce((SELECT jsonb_agg(coalesce(u.nombre_display,concat_ws(' ',u.nombre,u.apellido)) ORDER BY p.profile_id)
      FROM public.meeting_participants p JOIN public.usuarios u ON u.id=p.profile_id WHERE p.meeting_id=m.id),'[]'::jsonb));
 -- No premature creator-only mail during the multi-step creation UI.
 IF NOT p_create AND NOT EXISTS(SELECT 1 FROM public.meeting_mail_state WHERE meeting_id=m.id)
 AND m.created_at >= (SELECT enabled_since FROM public.meeting_mail_activation) THEN RETURN; END IF;
 INSERT INTO public.meeting_mail_state(meeting_id,snapshot) VALUES(m.id,'{}') ON CONFLICT DO NOTHING;
 SELECT snapshot,revision INTO prior,rev FROM public.meeting_mail_state WHERE meeting_id=m.id FOR UPDATE;
 IF prior=snap THEN RETURN; END IF;
 kind:=CASE WHEN rev=0 AND p_create THEN 'created' ELSE 'changed' END;
 rev:=rev+1;
 UPDATE public.meeting_mail_state SET snapshot=snap,revision=rev WHERE meeting_id=m.id;
 SELECT coalesce(jsonb_agg(jsonb_build_object('name',coalesce(u.nombre_display,concat_ws(' ',u.nombre,u.apellido)),'email',u.email)),'[]'::jsonb)
 INTO recipients FROM public.usuarios u WHERE u.email IS NOT NULL AND btrim(u.email) ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
 AND (u.auth_id=m.user_id OR u.id IN (SELECT profile_id FROM public.meeting_participants WHERE meeting_id=m.id));
 prefix:=CASE WHEN kind='created' THEN 'Convocatoria de reunión' ELSE 'Actualización de reunión' END;
 message:=jsonb_build_object('from','Stratix Meet <notifications@stratixsolutions.us>',
  'subject',prefix||': '||m.title,
  'text',prefix||E'\n'||m.title||E'\nFecha: '||m.meeting_date||E'\nHora: '||coalesce(m.start_time::text,'Sin hora')||' – '||coalesce(m.end_time::text,'Sin hora')||
  E'\nLugar: '||coalesce(m.location,'Sin lugar')||E'\nConvocados: '||coalesce((SELECT string_agg(value,', ') FROM jsonb_array_elements_text(snap->'inviteeNames')),'Sin convocados'));
 -- Freeze exact provider body before first claim, including template and sender.
 PERFORM public.enqueue_meeting_mail(m.id,'lifecycle/'||m.id||'/'||rev,kind,snap||message,recipients);
END $$;
REVOKE ALL ON FUNCTION public.capture_meeting_mail(uuid,boolean) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.meeting_mail_created_trigger() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.event_type='meeting_created' AND NEW.actor_id=(SELECT user_id FROM public.meetings WHERE id=NEW.meeting_id) THEN
  PERFORM public.capture_meeting_mail(NEW.meeting_id,true);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER meeting_mail_after_created AFTER INSERT ON public.meeting_events
 FOR EACH ROW EXECUTE FUNCTION public.meeting_mail_created_trigger();

CREATE FUNCTION public.meeting_mail_changed_trigger() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_TABLE_NAME='meetings' THEN PERFORM public.capture_meeting_mail(NEW.id);
 ELSE PERFORM public.capture_meeting_mail(CASE WHEN TG_OP='DELETE' THEN OLD.meeting_id ELSE NEW.meeting_id END);
 END IF;
 RETURN NULL;
END $$;
-- Deferred triggers observe the final invitee set once per transaction, not every intermediate row.
CREATE CONSTRAINT TRIGGER meeting_mail_after_editorial AFTER UPDATE ON public.meetings
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.meeting_mail_changed_trigger();
CREATE CONSTRAINT TRIGGER meeting_mail_after_invitees AFTER INSERT OR UPDATE OR DELETE ON public.meeting_participants
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.meeting_mail_changed_trigger();
REVOKE ALL ON FUNCTION public.meeting_mail_created_trigger(),public.meeting_mail_changed_trigger() FROM PUBLIC,anon,authenticated;

