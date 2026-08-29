-- Enciende la RLS en las cuatro tablas que corrían sin ella.
--
-- INCIDENTE del 29/08/2026: `actividades`, `usuarios`, `historial` y `notificaciones` tenían
-- `relrowsecurity = false` en producción, con `anon` —la llave que viaja en el bundle del
-- browser— teniendo SELECT/INSERT/UPDATE/DELETE/TRUNCATE sobre las cuatro. Las policies de
-- `actividades` y `usuarios` estaban escritas y Postgres nunca las evaluó: con RLS apagada ni
-- las mira.
--
-- La etapa 1 (REVOKE de `anon`) se ejecutó el 29/08 y cerró la vía no autenticada. Esta
-- migración es la etapa 2: cierra la vía de adentro, donde hoy cualquier usuario logueado
-- —incluido `sin_asignar`, que por diseño tiene cero módulos— lee y escribe las cuatro tablas.
--
-- Lo que esta migración NO hace, a propósito: restringir `actividades` más de lo que ya
-- restringía su policy de lectura. Las escrituras quedan gateadas por el mismo módulo que las
-- lecturas. Apretar más —que sólo el responsable o el solicitante editen— es una decisión de
-- producto, no parte de tapar un agujero, y se hace aparte para que este cambio se pueda
-- revertir sin discutir permisos.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. `historial` — la trampa que rompe todo lo demás
-- ---------------------------------------------------------------------------
-- `log_cambio_actividad` es el trigger que audita `actividades`, y NO es SECURITY DEFINER: corre
-- con los permisos de quien disparó el UPDATE. Encender RLS sobre `historial` sin arreglar esto
-- hace que su INSERT sea rechazado y **se lleve puesto el UPDATE entero**: nadie podría editar
-- una actividad.
--
-- Un trigger de auditoría tiene que poder escribir SIEMPRE, con independencia de los permisos de
-- quien provoca el cambio — si el usuario pudiera evitar que se registre, la traza no sirve.
-- `SET search_path` es obligatorio en una función SECURITY DEFINER: sin él, quien la invoca puede
-- anteponer un esquema propio y hacer que `insert into historial` apunte a otra tabla.
CREATE OR REPLACE FUNCTION public.log_cambio_actividad()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
begin
  if tg_op = 'UPDATE' then
    if old.estado != new.estado then
      insert into historial (tabla, registro_id, accion, campo, valor_anterior, valor_nuevo)
      values ('actividades', new.id, 'updated', 'estado', old.estado, new.estado);
    end if;
    if old.verificado != new.verificado then
      insert into historial (tabla, registro_id, accion, campo, valor_anterior, valor_nuevo)
      values ('actividades', new.id, 'updated', 'verificado', old.verificado, new.verificado);
    end if;
  elsif tg_op = 'INSERT' then
    insert into historial (tabla, registro_id, accion)
    values ('actividades', new.id, 'created');
  end if;
  return new;
end;
$function$;

ALTER TABLE public.historial ENABLE ROW LEVEL SECURITY;

-- Sólo lectura, y sólo admin: es una traza de auditoría y hoy no la consume ninguna pantalla.
-- No hay policy de INSERT a propósito — el único que escribe acá es el trigger de arriba, que
-- ahora saltea la RLS por ser SECURITY DEFINER. Abrir la lectura después es una línea.
DROP POLICY IF EXISTS "historial_admin_read" ON public.historial;
CREATE POLICY "historial_admin_read" ON public.historial
  FOR SELECT USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. `usuarios` — las lecturas ya estaban cubiertas; faltaban las escrituras
-- ---------------------------------------------------------------------------
-- Tres policies de SELECT ya existen y dos son `true`, así que encender RLS no cambia ninguna
-- lectura: el Directorio y los dropdowns de responsable siguen viendo a todos.
--
-- Lo que falta es el UPDATE. El cliente escribe `online_at` y `ubicacion` (presencia) sobre la
-- fila propia, y esas llamadas terminan en `.then(() => {})`: **el error se traga**. Sin esta
-- policy la presencia dejaría de funcionar en silencio, que es la peor forma de romperse.
--
-- El resto de la escritura sobre `usuarios` pasa por rutas API con `service_role`, que saltea la
-- RLS: crear, editar, activar y borrar usuarios siguen igual. Y `usuarios.rol` sigue protegido
-- por el trigger `prevent_rol_self_change`, que es independiente de esto.
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuario_update_propio" ON public.usuarios;
CREATE POLICY "usuario_update_propio" ON public.usuarios
  FOR UPDATE USING (auth_id = auth.uid()) WITH CHECK (auth_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. Lo que se gatea por módulo: `actividades` y `notificaciones`
-- ---------------------------------------------------------------------------
-- El slug va en una variable y la migración aborta si no existe (rules/base-de-datos.md). No es
-- ceremonia: `has_module()` abre con `is_admin() OR ...`, así que un slug mal tipeado devuelve
-- true para el admin —que es quien escribe y prueba la migración— y false en silencio para todo
-- el resto. Es la misma clase de falla que esta migración viene a arreglar.
DO $$
DECLARE
  slug text := 'stratix-mkt';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug) THEN
    RAISE EXCEPTION 'slug de módulo desconocido: %', slug;
  END IF;

  -- `actividades`: leer ya estaba cubierto por `colaborador_read` (FOR SELECT). La única policy
  -- FOR ALL era `admin_all`, así que encender RLS sin esto dejaría a todo no-admin sin poder
  -- crear ni mover una tarea — `src/shared/data/actividades.ts` escribe desde el browser.
  EXECUTE 'ALTER TABLE public.actividades ENABLE ROW LEVEL SECURITY';

  EXECUTE 'DROP POLICY IF EXISTS "actividades_insert_modulo" ON public.actividades';
  EXECUTE format(
    'CREATE POLICY "actividades_insert_modulo" ON public.actividades
       FOR INSERT WITH CHECK (public.has_module(%L))', slug);

  EXECUTE 'DROP POLICY IF EXISTS "actividades_update_modulo" ON public.actividades';
  EXECUTE format(
    'CREATE POLICY "actividades_update_modulo" ON public.actividades
       FOR UPDATE USING (public.has_module(%L)) WITH CHECK (public.has_module(%L))', slug, slug);

  EXECUTE 'DROP POLICY IF EXISTS "actividades_delete_modulo" ON public.actividades';
  EXECUTE format(
    'CREATE POLICY "actividades_delete_modulo" ON public.actividades
       FOR DELETE USING (public.has_module(%L))', slug);

  -- `notificaciones`: cero policies hoy.
  EXECUTE 'ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY';

  -- Cada quien ve y marca como leídas las suyas. `usuarios.auth_id` es el puente a `auth.uid()`.
  EXECUTE 'DROP POLICY IF EXISTS "notif_propias_read" ON public.notificaciones';
  EXECUTE
    'CREATE POLICY "notif_propias_read" ON public.notificaciones
       FOR SELECT USING (public.is_admin()
         OR usuario_id IN (SELECT u.id FROM public.usuarios u WHERE u.auth_id = auth.uid()))';

  EXECUTE 'DROP POLICY IF EXISTS "notif_propias_update" ON public.notificaciones';
  EXECUTE
    'CREATE POLICY "notif_propias_update" ON public.notificaciones
       FOR UPDATE USING (public.is_admin()
         OR usuario_id IN (SELECT u.id FROM public.usuarios u WHERE u.auth_id = auth.uid()))';

  -- El INSERT es para OTRO: al asignar una tarea, quien la crea le deja la notificación al
  -- responsable (`useActividadForm` inserta con `usuario_id: valores.responsable_id`). Por eso no
  -- se puede gatear por "es mía": se gatea por poder crear la tarea que la origina.
  EXECUTE 'DROP POLICY IF EXISTS "notif_insert_modulo" ON public.notificaciones';
  EXECUTE format(
    'CREATE POLICY "notif_insert_modulo" ON public.notificaciones
       FOR INSERT WITH CHECK (public.has_module(%L))', slug);
END $$;

COMMIT;
