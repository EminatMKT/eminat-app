-- Hace OPCIONAL el heredero en admin_reassign_and_delete.
--
-- Antes: borrar un usuario bloqueado por FK exigía elegir un heredero, aunque
-- tuviera 0 tareas (el bloqueo real eran registros automáticos: notificaciones,
-- marcaciones del heartbeat). Pedir "heredar 0 tareas" a otra persona no tiene
-- sentido.
--
-- Ahora: si p_new_id IS NULL, no se transfiere nada — solo se limpian los hijos
-- y se borra la fila. Con heredero el comportamiento es idéntico al anterior.
-- Se agrega limpieza defensiva de historial y slots_calendario para que el
-- borrado-sin-heredero no quede atrapado por otra FK (mismo set que el teardown
-- de e2e). Todas las limpiezas extra van en bloques tolerantes a tabla ausente.
--
-- Misma firma (uuid, uuid, text, text) → CREATE OR REPLACE reemplaza la función;
-- p_new_id/p_new_ref pasan a tener DEFAULT NULL.

CREATE OR REPLACE FUNCTION "public"."admin_reassign_and_delete"(
  "p_old_id" "uuid",
  "p_new_id" "uuid" DEFAULT NULL,
  "p_new_ref" "text" DEFAULT NULL,
  "p_status_override" "text" DEFAULT NULL
) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_old_name       text;
  v_old_ref        text;
  v_transferred    int := 0;
  v_notifs_deleted int := 0;
  v_set_estado     text := NULL;
  v_stamp          text;
BEGIN
  SELECT nombre_display, responsable_ref
    INTO v_old_name, v_old_ref
    FROM public.usuarios
   WHERE id = p_old_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario a borrar % no existe', p_old_id;
  END IF;

  IF p_new_id IS NOT NULL THEN
    -- ── Con heredero: transferir actividades ────────────────────────────
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
            || ' (' || COALESCE(v_old_ref, '?') || ') el '
            || to_char(now() AT TIME ZONE 'America/Guayaquil', 'YYYY-MM-DD');

    UPDATE public.actividades
       SET responsable_id  = p_new_id,
           responsable_ref = p_new_ref,
           estado          = COALESCE(v_set_estado, estado),
           verificado      = CASE
                               WHEN p_status_override = 'aprobado' THEN 'Aprobado'
                               ELSE verificado
                             END,
           notas_jefe      = CASE
                               WHEN notas_jefe IS NULL OR notas_jefe = ''
                                 THEN v_stamp
                               ELSE notas_jefe || E'\n' || v_stamp
                             END,
           updated_at      = now()
     WHERE responsable_id = p_old_id;
    GET DIAGNOSTICS v_transferred = ROW_COUNT;
  ELSE
    -- ── Sin heredero: solo válido si no quedan actividades huérfanas ─────
    IF EXISTS (SELECT 1 FROM public.actividades WHERE responsable_id = p_old_id) THEN
      RAISE EXCEPTION 'El usuario tiene actividades; se requiere un heredero';
    END IF;
  END IF;

  -- Referencias secundarias: se anulan tengamos o no heredero.
  UPDATE public.actividades SET solicitante_id  = NULL WHERE solicitante_id  = p_old_id;
  UPDATE public.actividades SET aprobado_por_id = NULL WHERE aprobado_por_id = p_old_id;
  UPDATE public.usuarios    SET validado_por    = NULL WHERE validado_por    = p_old_id;

  DELETE FROM public.notificaciones WHERE usuario_id = p_old_id;
  GET DIAGNOSTICS v_notifs_deleted = ROW_COUNT;

  BEGIN DELETE FROM public.solicitudes     WHERE usuario_id = p_old_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM public.marcaciones     WHERE usuario_id = p_old_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM public.historial       WHERE usuario_id = p_old_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;
  BEGIN DELETE FROM public.slots_calendario WHERE usuario_id = p_old_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  DELETE FROM public.usuarios WHERE id = p_old_id;

  RETURN jsonb_build_object(
    'ok',               true,
    'transferred',      v_transferred,
    'notifs_deleted',   v_notifs_deleted,
    'old_user',         v_old_name,
    'old_ref',          v_old_ref,
    'status_override',  p_status_override
  );
END;
$$;
