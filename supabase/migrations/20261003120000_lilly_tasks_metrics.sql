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

CREATE OR REPLACE FUNCTION public.queue_task_assignment_email() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.responsable_id IS NOT NULL AND
     (TG_OP = 'INSERT' OR NEW.responsable_id IS DISTINCT FROM OLD.responsable_id) THEN
    INSERT INTO public.task_email_outbox(activity_id, recipient_id, event)
    VALUES (NEW.id, NEW.responsable_id, CASE WHEN TG_OP = 'INSERT' THEN 'created' ELSE 'reassigned' END);
    IF NEW.responsable_id IS DISTINCT FROM (SELECT id FROM public.usuarios WHERE auth_id = auth.uid() LIMIT 1) THEN
      INSERT INTO public.notificaciones(usuario_id, tipo, titulo, mensaje, actividad_id, leida)
      VALUES (NEW.responsable_id, 'tarea_asignada', 'Nueva tarea asignada', 'Tienes una tarea asignada en LILLY.', NEW.id, false);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_task_assignment_email() FROM PUBLIC;
DROP TRIGGER IF EXISTS actividades_assignment_email ON public.actividades;
-- Fresh databases already ran the earlier multi-responsable migration, which removed
-- responsable_id. Production applied this file before that migration; keep its original
-- trigger only when the legacy column still exists. No new Production migration is needed.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'actividades' AND column_name = 'responsable_id') THEN
    CREATE TRIGGER actividades_assignment_email AFTER INSERT OR UPDATE OF responsable_id
    ON public.actividades FOR EACH ROW EXECUTE FUNCTION public.queue_task_assignment_email();
  END IF;
END $$;
