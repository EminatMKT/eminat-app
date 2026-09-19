-- Idempotencia transaccional para Meet. APLICADA Y VERIFICADA EN SUPABASE PRODUCTION.
-- actividades sigue siendo la única Task; topics.actividad_id conserva el vínculo.
CREATE OR REPLACE FUNCTION public.create_meet_activity_for_topic(
  p_topic_id uuid, p_titulo text, p_descripcion text, p_responsable_id uuid,
  p_fecha_inicio date, p_fecha_entrega date, p_empresa text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  linked_id uuid;
  actor_id uuid;
  meeting_owner_id uuid;
BEGIN
  -- La identidad nunca llega del cliente. Se deriva exclusivamente del JWT.
  SELECT id INTO actor_id
    FROM public.usuarios
   WHERE auth_id = auth.uid()
     AND activo = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'active_actor_not_found'; END IF;

  -- El bloqueo serializa reintentos concurrentes. La comprobación de propietario
  -- vive también dentro del RPC, además de las policies RLS del invocador.
  SELECT t.actividad_id, m.user_id
    INTO linked_id, meeting_owner_id
    FROM public.topics t
    JOIN public.meetings m ON m.id = t.meeting_id
   WHERE t.id = p_topic_id
     FOR UPDATE OF t;
  IF NOT FOUND THEN RAISE EXCEPTION 'topic_not_found'; END IF;
  IF meeting_owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'topic_forbidden';
  END IF;
  IF linked_id IS NOT NULL THEN RETURN linked_id; END IF;

  INSERT INTO public.actividades (
    titulo, descripcion, responsable_id, solicitante_id, created_by_id,
    empresa, estado, fecha_inicio, fecha_entrega
  ) VALUES (
    p_titulo, p_descripcion, p_responsable_id, actor_id, actor_id,
    p_empresa, 'Pendiente', p_fecha_inicio, p_fecha_entrega
  ) RETURNING id INTO linked_id;

  UPDATE public.topics SET actividad_id = linked_id WHERE id = p_topic_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'topic_link_failed'; END IF;
  RETURN linked_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_meet_activity_for_topic(uuid,text,text,uuid,date,date,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_meet_activity_for_topic(uuid,text,text,uuid,date,date,text) TO authenticated;
