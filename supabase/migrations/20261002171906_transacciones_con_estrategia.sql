-- Every process that writes two or more tables runs as one function (one transaction) and declares
-- how it behaves when two people run it on the same row. Checked by supabase/checks/transacciones.sh.
--   set_actividad_responsables  lock: FOR UPDATE on the task; a second writer waits, never mixes sets
--   admin_reassign_and_delete   lock: FOR UPDATE on the user being deleted; a concurrent assignment
--                               to that user waits on the FK and then fails instead of being orphaned
--   update_meet_activity        optimistic: p_expected_updated_at; a stale caller gets PT409 (HTTP 409)
--   save_role                   lock on edit (FOR UPDATE on the role); advisory lock + PK on create
BEGIN;

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

  -- Lock the task first: a second caller waits here, then replaces the whole set after us.
  SELECT id INTO touched FROM public.actividades WHERE id = p_actividad_id FOR UPDATE;
  IF touched IS NULL THEN
    RAISE EXCEPTION 'actividad_no_visible_o_no_editable: %', p_actividad_id
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.actividades SET updated_at = now() WHERE id = p_actividad_id;

  DELETE FROM public.actividad_responsables
   WHERE actividad_id = p_actividad_id;

  INSERT INTO public.actividad_responsables (actividad_id, usuario_id, es_lider)
  SELECT p_actividad_id, usuario_id, usuario_id = p_lider_id
  FROM unnest(ids) AS usuario_id;
END;
$$;

-- Dropped first so the file re-applies cleanly: CREATE OR REPLACE cannot rename parameters.
DROP FUNCTION IF EXISTS public.update_meet_activity(uuid, timestamptz, jsonb, uuid[], uuid, boolean);
CREATE OR REPLACE FUNCTION public.update_meet_activity(
  p_actividad_id uuid,
  p_expected_updated_at timestamptz,
  p_changes jsonb,
  p_usuario_ids uuid[] DEFAULT NULL::uuid[],
  p_lider_id uuid DEFAULT NULL::uuid,
  p_replace_responsibles boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  actual timestamptz;
BEGIN
  SELECT updated_at INTO actual FROM public.actividades WHERE id = p_actividad_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'actividad_no_visible_o_no_editable: %', p_actividad_id
      USING ERRCODE = '42501';
  END IF;
  -- Optimistic: whoever loaded an older version loses and is told so, nothing is written.
  IF actual IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'version_vencida: %', p_actividad_id
      USING ERRCODE = 'PT409';
  END IF;

  UPDATE public.actividades
     SET titulo        = CASE WHEN p_changes ? 'titulo' THEN p_changes->>'titulo' ELSE titulo END,
         descripcion   = CASE WHEN p_changes ? 'descripcion' THEN p_changes->>'descripcion' ELSE descripcion END,
         fecha_entrega = CASE WHEN p_changes ? 'fecha_entrega' THEN (p_changes->>'fecha_entrega')::date ELSE fecha_entrega END,
         empresa       = CASE WHEN p_changes ? 'empresa' THEN p_changes->>'empresa' ELSE empresa END,
         updated_at    = now()
   WHERE id = p_actividad_id;

  IF p_replace_responsibles THEN
    PERFORM public.set_actividad_responsables(p_actividad_id, p_usuario_ids, p_lider_id);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_role(
  p_key text,
  p_label text DEFAULT NULL,
  p_modules text[] DEFAULT NULL,
  p_is_new boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  sistema boolean;
BEGIN
  IF p_is_new THEN
    -- Two admins creating the same key: the second waits, then hits the primary key (23505).
    PERFORM pg_advisory_xact_lock(hashtext('role:' || p_key));
    INSERT INTO public.roles (key, label, is_system) VALUES (p_key, trim(p_label), false);
    sistema := false;
  ELSE
    -- Two admins editing one role: the second waits and applies its whole change after the first.
    SELECT is_system INTO sistema FROM public.roles WHERE key = p_key FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'rol_inexistente: %', p_key USING ERRCODE = 'P0002';
    END IF;
    IF p_label IS NOT NULL THEN
      UPDATE public.roles SET label = trim(p_label) WHERE key = p_key;
    END IF;
  END IF;

  IF p_modules IS NOT NULL THEN
    IF sistema THEN
      RAISE EXCEPTION 'rol_de_sistema: %', p_key USING ERRCODE = '22023';
    END IF;
    DELETE FROM public.role_modules WHERE role_key = p_key;
    INSERT INTO public.role_modules (role_key, module_slug)
    SELECT p_key, slug FROM unnest(p_modules) AS slug;
  END IF;
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

  -- Lock the user being deleted before reading their tasks: a concurrent assignment to them takes
  -- a key-share lock on this row, so it waits and then fails on the FK instead of being orphaned.
  SELECT nombre_display INTO v_old_name FROM public.usuarios WHERE id = p_old_id FOR UPDATE;
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

REVOKE ALL ON FUNCTION public.update_meet_activity(uuid, timestamptz, jsonb, uuid[], uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_meet_activity(uuid, timestamptz, jsonb, uuid[], uuid, boolean) TO authenticated;

-- Only the admin API (service_role, behind requireAdmin) saves roles.
REVOKE ALL ON FUNCTION public.save_role(text, text, text[], boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_role(text, text, text[], boolean) TO service_role;

COMMIT;
