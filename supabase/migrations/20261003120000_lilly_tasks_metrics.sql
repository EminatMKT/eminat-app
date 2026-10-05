-- LILLY task email outbox and aggregate-only administrative metrics.
-- Apply to a non-production Supabase project before enabling the Preview deployment.
ALTER TABLE public.actividades ADD COLUMN IF NOT EXISTS assignment_request_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS actividades_assignment_request_id_key
  ON public.actividades (assignment_request_id) WHERE assignment_request_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.task_email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.actividades(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.usuarios(id),
  event text NOT NULL CHECK (event IN ('created', 'reassigned')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  provider_message_id text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
CREATE INDEX IF NOT EXISTS task_email_outbox_pending_idx ON public.task_email_outbox(activity_id, status);
ALTER TABLE public.task_email_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.task_email_outbox FROM anon, authenticated;
GRANT ALL ON public.task_email_outbox TO service_role;

-- `actividades.responsable_id` is gone (feat/multi-responsables, 2026-10-01): who executes a task
-- lives in `actividad_responsables` now, one row per responsible. `set_actividad_responsables`
-- replaces the whole set on every save (DELETE then re-INSERT), so this fires once per CURRENT
-- responsible on every save, not only on a genuinely new assignment — the old trigger could tell
-- "new" from "unchanged" via `NEW.responsable_id IS DISTINCT FROM OLD.responsable_id` on a single
-- column; a row-level AFTER INSERT on the join table has no equivalent OLD to compare against,
-- since the DELETE already ran. ponytail: re-notifying unchanged responsibles on every edit, not
-- just new ones; narrow this to real adds (e.g. have `set_actividad_responsables` diff and pass it
-- in) when this feature is actually wired up end to end.
CREATE OR REPLACE FUNCTION public.queue_task_assignment_email() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.task_email_outbox(activity_id, recipient_id, event)
  VALUES (NEW.actividad_id, NEW.usuario_id, 'reassigned');
  IF NEW.usuario_id IS DISTINCT FROM (SELECT id FROM public.usuarios WHERE auth_id = auth.uid() LIMIT 1) THEN
    INSERT INTO public.notificaciones(usuario_id, tipo, titulo, mensaje, actividad_id, leida)
    VALUES (NEW.usuario_id, 'tarea_asignada', 'Nueva tarea asignada', 'Tienes una tarea asignada en LILLY.', NEW.actividad_id, false);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_task_assignment_email() FROM PUBLIC;
DROP TRIGGER IF EXISTS actividades_assignment_email ON public.actividades;
DROP TRIGGER IF EXISTS actividad_responsables_assignment_email ON public.actividad_responsables;
CREATE TRIGGER actividad_responsables_assignment_email AFTER INSERT
ON public.actividad_responsables FOR EACH ROW EXECUTE FUNCTION public.queue_task_assignment_email();
