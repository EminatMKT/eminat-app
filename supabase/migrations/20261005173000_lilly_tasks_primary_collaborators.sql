-- Keep the existing assignment relation. Its leader is the primary responsible;
-- every other row is a collaborator. Historical tasks without a leader remain readable.
ALTER TABLE public.actividades
  ADD COLUMN IF NOT EXISTS responsable_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL;

-- A preexisting legacy trigger must be removed before the backfill, otherwise
-- historical rows would generate fresh assignment notices during migration.
DROP TRIGGER IF EXISTS actividades_assignment_email ON public.actividades;
DROP TRIGGER IF EXISTS actividad_responsables_assignment_email ON public.actividad_responsables;

UPDATE public.actividades a SET responsable_id = (
  SELECT ar.usuario_id FROM public.actividad_responsables ar
  WHERE ar.actividad_id = a.id
  ORDER BY ar.es_lider DESC, ar.usuario_id LIMIT 1
) WHERE a.responsable_id IS NULL;

CREATE INDEX IF NOT EXISTS actividades_responsable_id_idx
  ON public.actividades (responsable_id) WHERE responsable_id IS NOT NULL;

-- Assignment notifications now come exclusively from relation changes.
ALTER TABLE public.task_email_outbox DROP CONSTRAINT IF EXISTS task_email_outbox_event_check;
ALTER TABLE public.task_email_outbox ADD CONSTRAINT task_email_outbox_event_check
  CHECK (event IN ('created', 'reassigned', 'collaborator_added'));

CREATE FUNCTION public.queue_task_participant_notice() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  actor_id uuid;
  task_title text;
  task_due date;
  event_name text;
BEGIN
  IF TG_OP = 'UPDATE' AND (NOT NEW.es_lider OR OLD.es_lider) THEN RETURN NEW; END IF;
  SELECT u.id INTO actor_id FROM public.usuarios u WHERE u.auth_id = auth.uid() LIMIT 1;
  SELECT a.titulo, a.fecha_entrega INTO task_title, task_due
    FROM public.actividades a WHERE a.id = NEW.actividad_id;
  event_name := CASE WHEN NEW.es_lider THEN 'reassigned' ELSE 'collaborator_added' END;

  UPDATE public.task_email_outbox SET status = 'failed',
    error = 'Asignación reemplazada antes del envío.', next_attempt_at = NULL
    WHERE activity_id = NEW.actividad_id AND recipient_id = NEW.usuario_id
      AND status IN ('pending', 'failed');
  INSERT INTO public.task_email_outbox (activity_id, recipient_id, event)
    VALUES (NEW.actividad_id, NEW.usuario_id, event_name);

  IF actor_id IS DISTINCT FROM NEW.usuario_id THEN
    INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje, actividad_id, leida)
    VALUES (NEW.usuario_id, 'tarea_asignada',
      CASE WHEN NEW.es_lider THEN 'Nueva tarea asignada' ELSE 'Nueva colaboración en tarea' END,
      left(coalesce(nullif(task_title, ''), 'Tarea sin título'), 160) ||
        CASE WHEN task_due IS NOT NULL THEN ' · Entrega: ' || to_char(task_due, 'DD/MM/YYYY') ELSE '' END,
      NEW.actividad_id, false);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_task_participant_notice() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS task_participant_notice ON public.actividad_responsables;
CREATE TRIGGER task_participant_notice
  AFTER INSERT OR UPDATE OF es_lider ON public.actividad_responsables
  FOR EACH ROW EXECUTE FUNCTION public.queue_task_participant_notice();

-- Diff the set in place: editing a title, dates, or another collaborator must
-- never delete/reinsert unchanged people and resend their assignment notices.
CREATE OR REPLACE FUNCTION public.set_actividad_responsables(
  p_actividad_id uuid, p_usuario_ids uuid[], p_lider_id uuid DEFAULT NULL::uuid
) RETURNS timestamptz
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE
  ids uuid[];
  touched uuid;
  stamp timestamptz;
BEGIN
  SELECT COALESCE(array_agg(DISTINCT person ORDER BY person), ARRAY[]::uuid[])
    INTO ids FROM unnest(COALESCE(p_usuario_ids, ARRAY[]::uuid[])) AS person
    WHERE person IS NOT NULL;
  IF p_lider_id IS NULL OR NOT (p_lider_id = ANY(ids)) THEN
    RAISE EXCEPTION 'responsable_principal_requerido' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO touched FROM public.actividades WHERE id = p_actividad_id FOR UPDATE;
  IF touched IS NULL THEN
    RAISE EXCEPTION 'actividad_no_visible_o_no_editable: %', p_actividad_id
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.actividad_responsables ar
    WHERE ar.actividad_id = p_actividad_id AND NOT (ar.usuario_id = ANY(ids));
  UPDATE public.actividad_responsables ar SET es_lider = false
    WHERE ar.actividad_id = p_actividad_id AND ar.es_lider AND ar.usuario_id <> p_lider_id;
  INSERT INTO public.actividad_responsables (actividad_id, usuario_id, es_lider)
    SELECT p_actividad_id, person, person = p_lider_id FROM unnest(ids) AS person
    WHERE NOT EXISTS (SELECT 1 FROM public.actividad_responsables ar
      WHERE ar.actividad_id = p_actividad_id AND ar.usuario_id = person);
  UPDATE public.actividad_responsables ar SET es_lider = true
    WHERE ar.actividad_id = p_actividad_id AND ar.usuario_id = p_lider_id AND NOT ar.es_lider;

  UPDATE public.actividades SET responsable_id = p_lider_id, updated_at = now()
    WHERE id = p_actividad_id RETURNING updated_at INTO stamp;
  RETURN stamp;
END;
$$;
REVOKE ALL ON FUNCTION public.set_actividad_responsables(uuid, uuid[], uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_actividad_responsables(uuid, uuid[], uuid) TO authenticated, service_role;

-- Legacy single-assignee clients, including /api/tasks/save, still write the
-- primary column. Bring their write into the same relation and outbox path.
CREATE FUNCTION public.sync_task_primary_assignment() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE collaborators uuid[];
BEGIN
  IF NEW.responsable_id IS NULL OR
    (TG_OP = 'UPDATE' AND NEW.responsable_id IS NOT DISTINCT FROM OLD.responsable_id) THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.actividad_responsables ar
    WHERE ar.actividad_id = NEW.id AND ar.usuario_id = NEW.responsable_id AND ar.es_lider) THEN
    RETURN NEW;
  END IF;
  SELECT COALESCE(array_agg(ar.usuario_id), ARRAY[]::uuid[]) INTO collaborators
    FROM public.actividad_responsables ar
    WHERE ar.actividad_id = NEW.id AND NOT ar.es_lider;
  PERFORM public.set_actividad_responsables(NEW.id,
    array_append(collaborators, NEW.responsable_id), NEW.responsable_id);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_task_primary_assignment() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER sync_task_primary_assignment
  AFTER INSERT OR UPDATE OF responsable_id ON public.actividades
  FOR EACH ROW EXECUTE FUNCTION public.sync_task_primary_assignment();
