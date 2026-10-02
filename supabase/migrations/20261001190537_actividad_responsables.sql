BEGIN;

DO $$
DECLARE
  slug_tasks   text := 'tasks';
  slug_stratix text := 'stratix-mkt';
  cond         text;
  active_actor text;
  predicate    text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug_tasks) THEN
    RAISE EXCEPTION 'slug de módulo desconocido: %', slug_tasks;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug_stratix) THEN
    RAISE EXCEPTION 'slug de módulo desconocido: %', slug_stratix;
  END IF;

  cond := format('(public.has_module(%L) OR public.has_module(%L))', slug_tasks, slug_stratix);
  active_actor := 'EXISTS (
    SELECT 1
    FROM public.usuarios actor
    WHERE actor.auth_id = auth.uid()
      AND actor.activo = true
  )';
  predicate := format(
    '%s AND %s AND EXISTS (SELECT 1 FROM public.actividades a WHERE a.id = actividad_responsables.actividad_id)',
    cond,
    active_actor
  );

  CREATE TABLE public.actividad_responsables (
    actividad_id uuid NOT NULL,
    usuario_id   uuid NOT NULL,
    es_lider     boolean NOT NULL DEFAULT false,
    PRIMARY KEY (actividad_id, usuario_id),
    CONSTRAINT actividad_responsables_actividad_id_fkey
      FOREIGN KEY (actividad_id) REFERENCES public.actividades(id) ON DELETE CASCADE,
    CONSTRAINT actividad_responsables_usuario_id_fkey
      FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id)
  );

  CREATE UNIQUE INDEX actividad_responsables_un_lider
    ON public.actividad_responsables (actividad_id)
    WHERE es_lider;

  ALTER TABLE public.actividad_responsables ENABLE ROW LEVEL SECURITY;

  EXECUTE 'DROP POLICY IF EXISTS "actividad_responsables_select_modulo" ON public.actividad_responsables';
  EXECUTE format(
    'CREATE POLICY %I ON public.actividad_responsables FOR SELECT USING (%s)',
    'actividad_responsables_select_modulo',
    predicate
  );

  EXECUTE 'DROP POLICY IF EXISTS "actividad_responsables_insert_modulo" ON public.actividad_responsables';
  EXECUTE format(
    'CREATE POLICY %I ON public.actividad_responsables FOR INSERT WITH CHECK (%s)',
    'actividad_responsables_insert_modulo',
    predicate
  );

  EXECUTE 'DROP POLICY IF EXISTS "actividad_responsables_update_modulo" ON public.actividad_responsables';
  EXECUTE format(
    'CREATE POLICY %I ON public.actividad_responsables FOR UPDATE USING (%s) WITH CHECK (%s)',
    'actividad_responsables_update_modulo',
    predicate,
    predicate
  );

  EXECUTE 'DROP POLICY IF EXISTS "actividad_responsables_delete_modulo" ON public.actividad_responsables';
  EXECUTE format(
    'CREATE POLICY %I ON public.actividad_responsables FOR DELETE USING (%s)',
    'actividad_responsables_delete_modulo',
    predicate
  );

  EXECUTE 'DROP POLICY IF EXISTS "marcaciones_equipo_hoy_select_modulo" ON public.marcaciones';
  EXECUTE format($policy$
    CREATE POLICY "marcaciones_equipo_hoy_select_modulo"
      ON public.marcaciones
      FOR SELECT
      TO authenticated
      USING (
        %s
        AND %s
        AND fecha = CURRENT_DATE
        AND EXISTS (
          SELECT 1
          FROM public.usuarios u
          WHERE u.id = marcaciones.usuario_id
            AND u.activo = true
        )
      )
  $policy$, cond, active_actor);
END $$;

REVOKE ALL ON public.actividad_responsables FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.actividad_responsables TO authenticated;
GRANT ALL ON public.actividad_responsables TO service_role;

REVOKE ALL ON public.marcaciones FROM anon, authenticated;
GRANT SELECT (usuario_id, fecha, hora_entrada, hora_salida, horas_trabajadas)
  ON public.marcaciones TO authenticated;

INSERT INTO public.actividad_responsables (actividad_id, usuario_id, es_lider)
SELECT a.id, a.responsable_id, false
FROM public.actividades a
WHERE a.responsable_id IS NOT NULL
ON CONFLICT (actividad_id, usuario_id) DO NOTHING;

DO $$
DECLARE
  actuales bigint;
  backfill bigint;
BEGIN
  SELECT count(*) INTO actuales
  FROM public.actividades
  WHERE responsable_id IS NOT NULL;

  SELECT count(*) INTO backfill
  FROM public.actividad_responsables;

  IF backfill <> actuales THEN
    RAISE EXCEPTION 'backfill actividad_responsables: % filas, se esperaban %', backfill, actuales;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.set_actividad_responsables(
  p_actividad_id uuid,
  p_usuario_ids uuid[],
  p_lider_id uuid DEFAULT NULL::uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  ids uuid[];
  touched uuid;
BEGIN
  SELECT COALESCE(array_agg(DISTINCT usuario_id ORDER BY usuario_id), ARRAY[]::uuid[])
    INTO ids
  FROM unnest(COALESCE(p_usuario_ids, ARRAY[]::uuid[])) AS usuario_id
  WHERE usuario_id IS NOT NULL;

  IF p_lider_id IS NOT NULL AND NOT (p_lider_id = ANY(ids)) THEN
    RAISE EXCEPTION 'lider_fuera_de_responsables'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.actividades
     SET updated_at = now()
   WHERE id = p_actividad_id
   RETURNING id INTO touched;

  IF touched IS NULL THEN
    RAISE EXCEPTION 'actividad_no_visible_o_no_editable: %', p_actividad_id
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.actividad_responsables
   WHERE actividad_id = p_actividad_id;

  INSERT INTO public.actividad_responsables (actividad_id, usuario_id, es_lider)
  SELECT p_actividad_id, usuario_id, usuario_id = p_lider_id
  FROM unnest(ids) AS usuario_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reassign_and_delete(
  p_old_id uuid, p_new_id uuid DEFAULT NULL::uuid, p_status_override text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_old_name       text;
  v_transferred    int := 0;
  v_notifs_deleted int := 0;
  v_set_estado     text := NULL;
  v_stamp          text;
  v_actividad_ids  uuid[] := ARRAY[]::uuid[];
BEGIN
  IF COALESCE(auth.role(), current_setting('role', true), current_user) <> 'service_role'
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin_required'
      USING ERRCODE = '42501';
  END IF;

  SELECT nombre_display INTO v_old_name FROM public.usuarios WHERE id = p_old_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario a borrar % no existe', p_old_id;
  END IF;

  SELECT COALESCE(array_agg(DISTINCT actividad_id), ARRAY[]::uuid[])
    INTO v_actividad_ids
  FROM public.actividad_responsables
  WHERE usuario_id = p_old_id;

  IF p_new_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_new_id) THEN
      RAISE EXCEPTION 'Nuevo dueño % no existe', p_new_id;
    END IF;
    IF p_old_id = p_new_id THEN
      RAISE EXCEPTION 'No puedes heredar a la misma persona';
    END IF;

    IF p_status_override IS NULL THEN
      NULL;
    ELSIF p_status_override = 'aprobado' THEN
      v_set_estado := 'Completado';
    ELSIF p_status_override = 'finalizado' THEN
      v_set_estado := 'Completado';
    ELSIF p_status_override = 'por_aprobar' THEN
      v_set_estado := 'Por aprobar';
    ELSE
      RAISE EXCEPTION 'status_override inválido: %', p_status_override;
    END IF;

    v_stamp := 'Heredada de ' || COALESCE(v_old_name, p_old_id::text)
            || ' el ' || to_char(now() AT TIME ZONE 'America/Guayaquil', 'YYYY-MM-DD');

    UPDATE public.actividades
       SET estado          = COALESCE(v_set_estado, estado),
           verificado      = CASE WHEN p_status_override = 'aprobado' THEN 'Aprobado' ELSE verificado END,
           notas_jefe      = CASE
                               WHEN notas_jefe IS NULL OR notas_jefe = '' THEN v_stamp
                               ELSE notas_jefe || E'\n' || v_stamp
                             END,
           updated_at      = now()
     WHERE id = ANY(v_actividad_ids);
    GET DIAGNOSTICS v_transferred = ROW_COUNT;

    WITH movidas AS (
      DELETE FROM public.actividad_responsables
       WHERE usuario_id = p_old_id
       RETURNING actividad_id, es_lider
    ), resumidas AS (
      SELECT actividad_id, bool_or(es_lider) AS es_lider
      FROM movidas
      GROUP BY actividad_id
    )
    INSERT INTO public.actividad_responsables (actividad_id, usuario_id, es_lider)
    SELECT actividad_id, p_new_id, es_lider
    FROM resumidas
    ON CONFLICT (actividad_id, usuario_id) DO UPDATE
      SET es_lider = public.actividad_responsables.es_lider OR EXCLUDED.es_lider;
  ELSE
    IF EXISTS (SELECT 1 FROM public.actividad_responsables WHERE usuario_id = p_old_id) THEN
      RAISE EXCEPTION 'El usuario tiene actividades; se requiere un heredero';
    END IF;
  END IF;

  UPDATE public.actividades SET solicitante_id  = NULL WHERE solicitante_id  = p_old_id;
  UPDATE public.actividades SET aprobado_por_id = NULL WHERE aprobado_por_id = p_old_id;
  UPDATE public.usuarios    SET validado_por    = NULL WHERE validado_por    = p_old_id;

  DELETE FROM public.notificaciones WHERE usuario_id = p_old_id;
  GET DIAGNOSTICS v_notifs_deleted = ROW_COUNT;

  BEGIN DELETE FROM public.solicitudes      WHERE usuario_id = p_old_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM public.marcaciones      WHERE usuario_id = p_old_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM public.slots_calendario WHERE usuario_id = p_old_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  DELETE FROM public.usuarios WHERE id = p_old_id;

  RETURN jsonb_build_object(
    'ok',               true,
    'transferred',      v_transferred,
    'notifs_deleted',   v_notifs_deleted,
    'old_user',         v_old_name,
    'status_override',  p_status_override
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_reassign_and_delete(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reassign_and_delete(uuid, uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.set_actividad_responsables(uuid, uuid[], uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_actividad_responsables(uuid, uuid[], uuid) TO authenticated, service_role;

DROP VIEW IF EXISTS public.v_equipo_hoy;

CREATE VIEW public.v_equipo_hoy
WITH (security_invoker = true) AS
 SELECT u.id,
    u.nombre,
    u.apellido,
    u.nombre_display,
    u.color,
    u.rol,
    u.id_sheet,
    m.hora_entrada,
    m.hora_salida,
    m.horas_trabajadas,
        CASE
            WHEN m.hora_entrada IS NOT NULL AND m.hora_salida IS NULL THEN 'presente'::text
            WHEN m.hora_entrada IS NOT NULL AND m.hora_salida IS NOT NULL THEN 'salio'::text
            WHEN u.marca_hora = false THEN 'sin_marcacion'::text
            ELSE 'ausente'::text
        END AS estado_hoy,
    ( SELECT count(*) AS count
        FROM public.actividad_responsables ar
        JOIN public.actividades a ON a.id = ar.actividad_id
       WHERE ar.usuario_id = u.id
         AND (a.estado = ANY (ARRAY['En proceso'::text, 'Pendiente'::text]))) AS tareas_activas
   FROM public.usuarios u
     LEFT JOIN public.marcaciones m ON m.usuario_id = u.id AND m.fecha = CURRENT_DATE
  WHERE u.activo = true
  ORDER BY u.nombre;

ALTER VIEW public.v_equipo_hoy OWNER TO postgres;

DROP VIEW IF EXISTS public.v_produccion_responsable;

CREATE VIEW public.v_produccion_responsable
WITH (security_invoker = true) AS
 SELECT u.nombre_display,
    u.id_sheet,
    u.color,
    count(a.id) AS total_tareas,
    count(CASE WHEN a.estado = 'Completado'::text THEN 1 ELSE NULL::integer END) AS completadas,
    count(CASE WHEN a.estado = 'Por aprobar'::text THEN 1 ELSE NULL::integer END) AS por_aprobar,
    count(CASE WHEN a.estado = 'En proceso'::text THEN 1 ELSE NULL::integer END) AS en_proceso,
    COALESCE(sum(a.dias_produccion), (0)::numeric) AS total_dias,
    COALESCE(sum(a.horas), (0)::numeric) AS total_horas,
    a.trimestre,
    a.mes
   FROM public.usuarios u
     LEFT JOIN public.actividad_responsables ar ON ar.usuario_id = u.id
     LEFT JOIN public.actividades a ON a.id = ar.actividad_id
  WHERE u.activo = true
  GROUP BY u.id, u.nombre_display, u.id_sheet, u.color, a.trimestre, a.mes;

ALTER VIEW public.v_produccion_responsable OWNER TO postgres;

REVOKE ALL ON public.v_equipo_hoy FROM anon, authenticated;
REVOKE ALL ON public.v_produccion_responsable FROM anon, authenticated;
GRANT SELECT ON public.v_equipo_hoy TO authenticated, service_role;
GRANT SELECT ON public.v_produccion_responsable TO authenticated, service_role;

DO $$
DECLARE
  quedan_anon text;
  inesperados_auth text;
  faltan_auth text;
BEGIN
  SELECT string_agg(distinct table_name || ':' || privilege_type, ', ')
    INTO quedan_anon
    FROM information_schema.role_table_grants
   WHERE table_schema = 'public'
     AND grantee = 'anon'
     AND table_name IN ('v_equipo_hoy', 'v_produccion_responsable');
  IF quedan_anon IS NOT NULL THEN
    RAISE EXCEPTION 'anon todavía tiene privilegios sobre las vistas: %', quedan_anon;
  END IF;

  SELECT string_agg(distinct table_name || ':' || privilege_type, ', ')
    INTO inesperados_auth
    FROM information_schema.role_table_grants
   WHERE table_schema = 'public'
     AND grantee = 'authenticated'
     AND table_name IN ('v_equipo_hoy', 'v_produccion_responsable')
     AND privilege_type <> 'SELECT';
  IF inesperados_auth IS NOT NULL THEN
    RAISE EXCEPTION 'authenticated tiene privilegios inesperados sobre las vistas: %', inesperados_auth;
  END IF;

  SELECT string_agg(vista, ', ')
    INTO faltan_auth
    FROM unnest(ARRAY['v_equipo_hoy', 'v_produccion_responsable']) AS vista
   WHERE NOT has_table_privilege('authenticated', 'public.' || vista, 'SELECT');
  IF faltan_auth IS NOT NULL THEN
    RAISE EXCEPTION 'authenticated perdió SELECT sobre las vistas: %', faltan_auth;
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.create_meet_activity_for_topic(uuid,text,text,uuid,date,date,text);

CREATE OR REPLACE FUNCTION public.create_meet_activity_for_topic(
  p_topic_id uuid,
  p_titulo text,
  p_descripcion text,
  p_responsable_ids uuid[],
  p_fecha_inicio date,
  p_fecha_entrega date,
  p_empresa text,
  p_lider_id uuid DEFAULT NULL::uuid
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
  SELECT id INTO actor_id
    FROM public.usuarios
   WHERE auth_id = auth.uid()
     AND activo = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'active_actor_not_found'; END IF;

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
    titulo, descripcion, solicitante_id, created_by_id,
    empresa, estado, fecha_inicio, fecha_entrega
  )
  SELECT p_titulo, p_descripcion, actor_id, actor_id,
         p_empresa, 'Pendiente', p_fecha_inicio, p_fecha_entrega
  RETURNING id INTO linked_id;

  PERFORM public.set_actividad_responsables(linked_id, p_responsable_ids, p_lider_id);

  UPDATE public.topics SET actividad_id = linked_id WHERE id = p_topic_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'topic_link_failed'; END IF;
  RETURN linked_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_meet_activity_for_topic(uuid,text,text,uuid[],date,date,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_meet_activity_for_topic(uuid,text,text,uuid[],date,date,text,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.log_cambio_actividad_responsables()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id uuid;
  old_payload text;
  new_payload text;
  activity_id uuid;
BEGIN
  SELECT id INTO actor_id FROM public.usuarios WHERE auth_id = auth.uid();

  IF TG_OP <> 'INSERT' THEN
    old_payload := jsonb_build_object('usuario_id', OLD.usuario_id, 'es_lider', OLD.es_lider)::text;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    new_payload := jsonb_build_object('usuario_id', NEW.usuario_id, 'es_lider', NEW.es_lider)::text;
  END IF;

  activity_id := COALESCE(NEW.actividad_id, OLD.actividad_id);

  INSERT INTO public.historial (tabla, registro_id, accion, campo, valor_anterior, valor_nuevo, usuario_id)
  SELECT
    'actividad_responsables',
    activity_id,
    CASE TG_OP WHEN 'INSERT' THEN 'created' WHEN 'UPDATE' THEN 'updated' ELSE 'deleted' END,
    'responsables',
    old_payload,
    new_payload,
    actor_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_log_actividad_responsables_insert ON public.actividad_responsables;
CREATE TRIGGER trg_log_actividad_responsables_insert
AFTER INSERT ON public.actividad_responsables
FOR EACH ROW EXECUTE FUNCTION public.log_cambio_actividad_responsables();

DROP TRIGGER IF EXISTS trg_log_actividad_responsables_update ON public.actividad_responsables;
CREATE TRIGGER trg_log_actividad_responsables_update
AFTER UPDATE ON public.actividad_responsables
FOR EACH ROW EXECUTE FUNCTION public.log_cambio_actividad_responsables();

DROP TRIGGER IF EXISTS trg_log_actividad_responsables_delete ON public.actividad_responsables;
CREATE TRIGGER trg_log_actividad_responsables_delete
AFTER DELETE ON public.actividad_responsables
FOR EACH ROW EXECUTE FUNCTION public.log_cambio_actividad_responsables();

DROP INDEX IF EXISTS public.idx_actividades_responsable;
ALTER TABLE public.actividades DROP CONSTRAINT IF EXISTS actividades_responsable_id_fkey;
ALTER TABLE public.actividades DROP COLUMN responsable_id;

COMMIT;
