-- One outbox event per assignment transition, with a claim shared by HTTP and cron.
ALTER TABLE public.task_email_outbox
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS sequence_id bigint;

CREATE SEQUENCE IF NOT EXISTS public.task_email_outbox_sequence_id_seq;
ALTER SEQUENCE public.task_email_outbox_sequence_id_seq OWNED BY public.task_email_outbox.sequence_id;
ALTER TABLE public.task_email_outbox ALTER COLUMN sequence_id
  SET DEFAULT nextval('public.task_email_outbox_sequence_id_seq');
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS seq
  FROM public.task_email_outbox WHERE sequence_id IS NULL
)
UPDATE public.task_email_outbox q SET sequence_id = ordered.seq
FROM ordered WHERE q.id = ordered.id;
SELECT setval('public.task_email_outbox_sequence_id_seq',
  GREATEST(COALESCE(max(sequence_id), 0), 1), count(*) > 0)
FROM public.task_email_outbox;
ALTER TABLE public.task_email_outbox ALTER COLUMN sequence_id SET NOT NULL;

-- Old `failed` rows may represent an uncertain provider outcome. Never replay them automatically.
UPDATE public.task_email_outbox SET next_attempt_at = NULL WHERE status = 'failed' AND attempts = 0;

CREATE INDEX IF NOT EXISTS task_email_outbox_due_idx
  ON public.task_email_outbox(next_attempt_at, created_at)
  WHERE status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS task_email_outbox_latest_idx
  ON public.task_email_outbox(activity_id, sequence_id DESC);
CREATE INDEX IF NOT EXISTS task_email_outbox_latest_recipient_idx
  ON public.task_email_outbox(activity_id, recipient_id, sequence_id DESC);

CREATE OR REPLACE FUNCTION public.claim_task_assignment_emails(
  p_activity_id uuid DEFAULT NULL, p_limit integer DEFAULT 25
)
RETURNS TABLE(id uuid, activity_id uuid, recipient_id uuid, event text, attempts integer, sequence_id bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH due AS (
    SELECT q.id FROM public.task_email_outbox q
    WHERE q.status IN ('pending', 'failed')
      AND q.attempts < 5 AND q.next_attempt_at <= now()
      AND (p_activity_id IS NULL OR q.activity_id = p_activity_id)
    ORDER BY q.created_at, q.id
    LIMIT LEAST(GREATEST(p_limit, 1), 50)
    FOR UPDATE SKIP LOCKED
  ), claimed AS (
    UPDATE public.task_email_outbox q SET
      status = 'sending', attempts = q.attempts + 1,
      claimed_at = now(), error = NULL
    FROM due WHERE q.id = due.id
    RETURNING q.id, q.activity_id, q.recipient_id, q.event, q.attempts, q.sequence_id
  ) SELECT * FROM claimed;
$$;
REVOKE ALL ON FUNCTION public.claim_task_assignment_emails(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_task_assignment_emails(uuid, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.queue_task_assignment_email() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor_id uuid;
  v_actor_name text;
  v_task public.actividades%ROWTYPE;
  v_message text;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_task FROM public.actividades WHERE id = NEW.actividad_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT u.id, coalesce(nullif(u.nombre_display, ''), nullif(trim(concat_ws(' ', u.nombre, u.apellido)), ''))
    INTO v_actor_id, v_actor_name
    FROM public.usuarios u WHERE u.auth_id = auth.uid() LIMIT 1;
  IF v_actor_id IS NULL THEN
    SELECT u.id, coalesce(nullif(u.nombre_display, ''), nullif(trim(concat_ws(' ', u.nombre, u.apellido)), ''))
      INTO v_actor_id, v_actor_name
      FROM public.usuarios u WHERE u.id = v_task.created_by_id LIMIT 1;
  END IF;

  UPDATE public.task_email_outbox SET status = 'failed',
    error = 'Asignación reemplazada antes del envío.', next_attempt_at = NULL
    WHERE activity_id = NEW.actividad_id
      AND recipient_id = NEW.usuario_id
      AND status IN ('pending', 'failed');

  INSERT INTO public.task_email_outbox(activity_id, recipient_id, event)
  VALUES (NEW.actividad_id, NEW.usuario_id, 'reassigned');

  -- Self-assignment already appears in the person's Tasks list; avoid a redundant bell item.
  IF v_actor_id IS DISTINCT FROM NEW.usuario_id THEN
    v_message := concat_ws(' ',
      CASE WHEN v_actor_name IS NOT NULL THEN 'Asignada por ' || v_actor_name || ':' ELSE NULL END,
      left(coalesce(nullif(v_task.titulo, ''), 'Tarea sin título'), 160));
    IF v_task.fecha_entrega IS NOT NULL THEN
      v_message := v_message || ' · Entrega: ' || to_char(v_task.fecha_entrega, 'DD/MM/YYYY');
    END IF;
    INSERT INTO public.notificaciones(usuario_id, tipo, titulo, mensaje, actividad_id, leida)
    VALUES (NEW.usuario_id, 'tarea_asignada', 'Nueva tarea asignada', v_message, NEW.actividad_id, false);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_task_assignment_email() FROM PUBLIC;
DROP TRIGGER IF EXISTS actividades_assignment_email ON public.actividades;
DROP TRIGGER IF EXISTS actividad_responsables_assignment_email ON public.actividad_responsables;
CREATE TRIGGER actividad_responsables_assignment_email AFTER INSERT
ON public.actividad_responsables FOR EACH ROW EXECUTE FUNCTION public.queue_task_assignment_email();
