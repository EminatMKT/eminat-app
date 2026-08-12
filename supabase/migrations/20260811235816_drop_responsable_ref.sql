-- Elimina los refs de texto: el código ya trabaja con las FK uuid.
--
-- El ref venía del dump del esquema original. Codificaba cargo + nombre —datos
-- que ya viven en usuario_cargos/cargos y usuarios.nombre— y por eso se
-- desincronizaba (DG_Ariana quedó con el nombre viejo de Arianna). Nunca fue
-- UNIQUE ni NOT NULL: 3 de 10 personas no tenían, y eso las dejaba fuera de ser
-- responsables o herederas.
--
-- Requiere la migración de backfill previa. IRREVERSIBLE.

-- Toda actividad tiene responsable: la integridad que el ref nunca dio.
ALTER TABLE public.actividades ALTER COLUMN responsable_id SET NOT NULL;

-- solicitante_id queda NULLABLE a propósito: el RPC lo anula al borrar al
-- solicitante, y una actividad sin quien la pidió es un estado válido.

ALTER TABLE public.actividades
  DROP COLUMN responsable_ref,
  DROP COLUMN solicitado_por;
ALTER TABLE public.usuarios DROP COLUMN responsable_ref;

-- El RPC pierde p_new_ref. La firma cambia, así que CREATE OR REPLACE no basta:
-- dejaría viva la sobrecarga de 4 argumentos y la ruta API podría pegarle a la
-- vieja. DROP explícito con la firma completa.
DROP FUNCTION IF EXISTS public.admin_reassign_and_delete(uuid, uuid, text, text);

CREATE FUNCTION public.admin_reassign_and_delete(
  p_old_id uuid,
  p_new_id uuid DEFAULT NULL,
  p_status_override text DEFAULT NULL
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_old_name       text;
  v_transferred    int := 0;
  v_notifs_deleted int := 0;
  v_set_estado     text := NULL;
  v_stamp          text;
BEGIN
  SELECT nombre_display
    INTO v_old_name
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
            || ' el ' || to_char(now() AT TIME ZONE 'America/Guayaquil', 'YYYY-MM-DD');

    UPDATE public.actividades
       SET responsable_id  = p_new_id,
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
    'status_override',  p_status_override
  );
END;
$$;

ALTER FUNCTION public.admin_reassign_and_delete(uuid, uuid, text) OWNER TO postgres;
GRANT ALL ON FUNCTION public.admin_reassign_and_delete(uuid, uuid, text) TO anon;
GRANT ALL ON FUNCTION public.admin_reassign_and_delete(uuid, uuid, text) TO authenticated;
GRANT ALL ON FUNCTION public.admin_reassign_and_delete(uuid, uuid, text) TO service_role;
