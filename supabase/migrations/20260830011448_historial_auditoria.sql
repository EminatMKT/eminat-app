-- Auditoría del módulo Reuniones sobre `historial`, y las roturas de la baja de un usuario.
-- Nada de esto está en el SQL de las tablas: son interacciones entre lo nuevo y lo que ya había.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Que borrar un usuario NO borre su rastro.
--    La FK era NO ACTION, así que `admin_reassign_and_delete` tenía que hacer
--    `DELETE FROM historial WHERE usuario_id = …` para poder borrar la fila de usuarios.
--    Resultado: desaparecía la traza de quien se va, que es justo la que se querría mirar.
ALTER TABLE public.historial DROP CONSTRAINT historial_usuario_id_fkey;
ALTER TABLE public.historial ADD CONSTRAINT historial_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Registrar QUIÉN, no sólo qué. Hoy 0 de 277 filas de historial tienen usuario_id.
CREATE OR REPLACE FUNCTION public.usuario_actual_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.usuarios WHERE auth_id = auth.uid();
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. La auditoría del módulo. Se registran las altas, las bajas y los dos cambios que
--    importan: el estado de la reunión y el del pendiente (con su fecha comprometida).
CREATE OR REPLACE FUNCTION public.log_reunion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO historial (tabla, registro_id, accion, usuario_id)
    VALUES (TG_TABLE_NAME, OLD.id, 'deleted', public.usuario_actual_id());
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO historial (tabla, registro_id, accion, usuario_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'created', public.usuario_actual_id());
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'reuniones' AND OLD.estado IS DISTINCT FROM NEW.estado THEN
    INSERT INTO historial (tabla, registro_id, accion, campo, valor_anterior, valor_nuevo, usuario_id)
    VALUES ('reuniones', NEW.id, 'updated', 'estado', OLD.estado, NEW.estado, public.usuario_actual_id());
  END IF;

  IF TG_TABLE_NAME = 'reunion_pendientes' THEN
    IF OLD.estado IS DISTINCT FROM NEW.estado THEN
      INSERT INTO historial (tabla, registro_id, accion, campo, valor_anterior, valor_nuevo, usuario_id)
      VALUES ('reunion_pendientes', NEW.id, 'updated', 'estado', OLD.estado, NEW.estado, public.usuario_actual_id());
    END IF;
    IF OLD.fecha_comprometida IS DISTINCT FROM NEW.fecha_comprometida THEN
      INSERT INTO historial (tabla, registro_id, accion, campo, valor_anterior, valor_nuevo, usuario_id)
      VALUES ('reunion_pendientes', NEW.id, 'updated', 'fecha_comprometida',
              OLD.fecha_comprometida::text, NEW.fecha_comprometida::text, public.usuario_actual_id());
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_log ON public.reuniones;
CREATE TRIGGER trg_log AFTER INSERT OR UPDATE OR DELETE ON public.reuniones
  FOR EACH ROW EXECUTE FUNCTION public.log_reunion();
DROP TRIGGER IF EXISTS trg_log ON public.reunion_pendientes;
CREATE TRIGGER trg_log AFTER INSERT OR UPDATE OR DELETE ON public.reunion_pendientes
  FOR EACH ROW EXECUTE FUNCTION public.log_reunion();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. La baja de un usuario rompía contra `reunion_participantes`, y no por una FK que
--    faltara: por DOS constraints de la migración del esquema que se contradicen entre sí.
--    `usuario_id` era ON DELETE SET NULL, pero `interno_xor_externo` exige que uno de los dos
--    —el usuario o el nombre del invitado— esté lleno. Al anular el usuario, la fila quedaba
--    con los dos en NULL y el CHECK abortaba el DELETE:
--        new row for relation "reunion_participantes" violates check constraint
--        "interno_xor_externo"
--    O sea: no se podía dar de baja a nadie que hubiera participado de una reunión.
--
--    El arreglo NO es aflojar el CHECK. Un acta es un registro: si alguien se va de la
--    empresa, el acta tiene que seguir diciendo que asistió. Así que el participante interno
--    se degrada a invitado externo CON SU NOMBRE, y los dos campos se escriben en el mismo
--    UPDATE — que es la única forma de pasar por el XOR sin estados intermedios inválidos.
ALTER TABLE public.reunion_participantes
  DROP CONSTRAINT reunion_participantes_usuario_id_fkey;
ALTER TABLE public.reunion_participantes
  ADD CONSTRAINT reunion_participantes_usuario_id_fkey
    FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);

CREATE OR REPLACE FUNCTION public.conservar_participante_de_usuario_borrado()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- La bandera es transaccional (el `true` del set_config) y la lee `proteger_acta_cerrada`:
  -- sin ella, dar de baja a alguien que participó de un acta YA CERRADA aborta. Y no alcanza
  -- con que la baja sea del admin — `is_admin()` mira `auth.uid()`, y la API admin corre con
  -- service_role, sin JWT, así que para el trigger no es admin.
  PERFORM set_config('app.baja_de_usuario', '1', true);
  UPDATE public.reunion_participantes
     SET usuario_id      = NULL,
         invitado_nombre = COALESCE(NULLIF(OLD.nombre_display, ''), OLD.email, 'usuario dado de baja'),
         invitado_email  = COALESCE(invitado_email, OLD.email)
   WHERE usuario_id = OLD.id;
  PERFORM set_config('app.baja_de_usuario', '0', true);
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_conservar_participante ON public.usuarios;
CREATE TRIGGER trg_conservar_participante BEFORE DELETE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.conservar_participante_de_usuario_borrado();

-- Se re-declara entera (20260829222113 la creó) para que honre la bandera de arriba. Lo demás
-- es idéntico: una función de Postgres no se parchea, se vuelve a declarar completa.
CREATE OR REPLACE FUNCTION public.proteger_acta_cerrada()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r_id uuid;
BEGIN
  IF current_setting('app.baja_de_usuario', true) = '1' THEN RETURN COALESCE(NEW, OLD); END IF;
  -- Va en dos ramas IF y NO en un CASE de una sola expresión: plpgsql compila la expresión
  -- entera de una asignación, así que `OLD.reunion_id` se resuelve aunque la rama no se tome.
  IF TG_TABLE_NAME = 'reuniones' THEN
    r_id := COALESCE(OLD.id, NEW.id);
  ELSE
    r_id := COALESCE(OLD.reunion_id, NEW.reunion_id);
  END IF;
  IF public.is_admin() THEN RETURN COALESCE(NEW, OLD); END IF;
  IF EXISTS (SELECT 1 FROM public.reuniones WHERE id = r_id AND estado = 'cerrada') THEN
    RAISE EXCEPTION 'el acta está cerrada: no se puede modificar';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. `admin_reassign_and_delete` re-declarada. Único cambio contra la versión anterior:
--    se quita `DELETE FROM public.historial WHERE usuario_id = p_old_id`, que ahora resuelve
--    la FK del punto 1 anulando el autor en vez de borrar la fila. Por reuniones no hace falta
--    agregar nada: `reuniones.created_by` y `reunion_pendientes.responsable_id` /
--    `completado_por_id` son ON DELETE SET NULL, y los participantes los cubre el trigger del
--    punto 4.
CREATE OR REPLACE FUNCTION public.admin_reassign_and_delete(
  p_old_id uuid, p_new_id uuid DEFAULT NULL::uuid, p_status_override text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_old_name       text;
  v_transferred    int := 0;
  v_notifs_deleted int := 0;
  v_set_estado     text := NULL;
  v_stamp          text;
BEGIN
  SELECT nombre_display INTO v_old_name FROM public.usuarios WHERE id = p_old_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario a borrar % no existe', p_old_id;
  END IF;

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
       SET responsable_id  = p_new_id,
           estado          = COALESCE(v_set_estado, estado),
           verificado      = CASE WHEN p_status_override = 'aprobado' THEN 'Aprobado' ELSE verificado END,
           notas_jefe      = CASE
                               WHEN notas_jefe IS NULL OR notas_jefe = '' THEN v_stamp
                               ELSE notas_jefe || E'\n' || v_stamp
                             END,
           updated_at      = now()
     WHERE responsable_id = p_old_id;
    GET DIAGNOSTICS v_transferred = ROW_COUNT;
  ELSE
    IF EXISTS (SELECT 1 FROM public.actividades WHERE responsable_id = p_old_id) THEN
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

COMMIT;
