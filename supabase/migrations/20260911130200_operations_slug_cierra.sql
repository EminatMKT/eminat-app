-- FASE 1, PASO 1C: retira `tasks`.
--
-- ⚠️ ESTA MIGRACIÓN NO PUEDE CORRER ANTES DE QUE EL BUNDLE NUEVO ESTÉ SIRVIENDO EN PROD. El
-- archivo no tiene forma de comprobarlo por sí solo — no hay ningún dato en la base que diga qué
-- bundle está desplegado — así que la verificación es manual: abrir `app.stratixsolutions.us` y
-- confirmar que el rail dice "Operations" y que `/operations` carga, ANTES de correr esto.
--
-- Si se corre antes de tiempo: el `DELETE` de abajo saca las filas `tasks` de `role_modules` y el
-- bloque `DO` le saca `has_module('tasks')` al `OR` de las cuatro policies de `actividades`. El
-- bundle viejo, que todavía pide `/tasks` y llama `has_module('tasks')`, pierde el módulo para
-- todo el mundo salvo `admin` (que corta por `is_admin()` y por eso NO sirve para probar esto).
-- No hay excepción, no hay log, no hay pantalla de error: la RLS simplemente deja de devolver
-- filas de `actividades`, la UI muestra tableros vacíos, y quien lo mire va a sospechar de todo
-- menos de esta migración porque no rompió nada visible — sólo dejó a todos sin datos.
--
-- El DELETE va por `module_slug` y NO enumerando roles: ahí es donde el drift muerde — una fila
-- que existe en prod y no en local se escapa de una lista escrita a mano. La regla del repo pide
-- enumerar a quién se le DA el módulo, que es el INSERT de 1A.
--
-- Orden dentro del bloque DO: el patrón del repo (1A, 20260911130000) verifica que cada slug
-- exista en `role_modules` ANTES de usarlo. Acá el slug viejo se USA para borrar, así que su
-- verificación tiene que correr ANTES del DELETE — si corriera después, la propia migración ya
-- habría borrado las filas que la verificación necesita, y el chequeo quedaría imposible de
-- cumplir para siempre (no protege nada, sólo documenta que ya es tarde). Por eso el DELETE vive
-- adentro del mismo bloque DO, después de los tres IF, y no como sentencia suelta antes.
--
-- NO es idempotente en el sentido de "correrla dos veces no hace nada": una segunda corrida
-- aborta ruidoso en el `IF NOT EXISTS (... slug_viejo ...)`, porque la primera corrida ya borró
-- esas filas. Es a propósito — falla fuerte en vez de fallar en silencio — pero quien la corra
-- dos veces por error se va a encontrar con una `RAISE EXCEPTION`, no con un no-op.
--
-- PRECHECK antes de pushear a prod — copiar y pegar, corrida como `db query --linked`:
--
--   SELECT v1.usuario_id, v1.nombre
--   FROM public.vistas_filtro v1
--   WHERE v1.ambito = 'tasks'
--     AND EXISTS (
--       SELECT 1 FROM public.vistas_filtro v2
--       WHERE v2.usuario_id = v1.usuario_id
--         AND v2.ambito = 'operations'
--         AND v2.nombre = v1.nombre
--     );
--
-- Cada fila que devuelve es una vista que el `UPDATE` de abajo NO va a mover (ver el comentario
-- ahí). Cero filas: nada se queda atrás. Si devuelve filas, no es un error — es información: esas
-- personas ya recrearon esa vista bajo `operations`, así que la copia vieja es redundante.
BEGIN;

DO $do$
DECLARE
  slug_nuevo   text := 'operations';
  slug_viejo   text := 'tasks';
  slug_stratix text := 'stratix-mkt';
  cond         text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug_nuevo) THEN
    RAISE EXCEPTION 'slug de módulo desconocido: %', slug_nuevo;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug_viejo) THEN
    RAISE EXCEPTION 'slug de módulo desconocido: %', slug_viejo;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug_stratix) THEN
    RAISE EXCEPTION 'slug de módulo desconocido: %', slug_stratix;
  END IF;

  DELETE FROM public.role_modules WHERE module_slug = slug_viejo;

  -- `stratix-mkt` se QUEDA en el OR: la sección Team de Stratix cuenta las tareas en proceso de
  -- cada persona (RosterCard), y sacarlo dejaría ese contador en cero, sin ningún error, para
  -- quien tenga Stratix y no operations. Lo explica 20260903235201.
  cond := format('(public.has_module(%L) OR public.has_module(%L))', slug_nuevo, slug_stratix);

  EXECUTE 'DROP POLICY IF EXISTS "colaborador_read" ON public.actividades';
  EXECUTE format('CREATE POLICY "colaborador_read" ON public.actividades FOR SELECT USING %s', cond);
  EXECUTE 'DROP POLICY IF EXISTS "actividades_insert_modulo" ON public.actividades';
  EXECUTE format('CREATE POLICY "actividades_insert_modulo" ON public.actividades
                    FOR INSERT WITH CHECK %s', cond);
  EXECUTE 'DROP POLICY IF EXISTS "actividades_update_modulo" ON public.actividades';
  EXECUTE format('CREATE POLICY "actividades_update_modulo" ON public.actividades
                    FOR UPDATE USING %s WITH CHECK %s', cond, cond);
  EXECUTE 'DROP POLICY IF EXISTS "actividades_delete_modulo" ON public.actividades';
  EXECUTE format('CREATE POLICY "actividades_delete_modulo" ON public.actividades
                    FOR DELETE USING %s', cond);
END $do$;

-- El ámbito de los filtros ES el slug: `useFilters(MODULE.OPERATIONS, …)`. Sin esto, cada vista
-- guardada del PR #68 desaparece del desplegable sin un error.
--
-- `vistas_filtro` tiene `UNIQUE (usuario_id, ambito, nombre)`. El escenario que esta migración
-- exige —bundle nuevo ya sirviendo— es el mismo que crea el choque: en esa ventana la gente ya
-- guarda vistas nuevas con `ambito='operations'`, así que alguien puede tener "Mis pendientes"
-- en `tasks` (la vieja) Y en `operations` (la que ya recreó) al mismo tiempo. Sin el
-- `NOT EXISTS`, ese `UPDATE` choca contra el UNIQUE y aborta la transacción entera — no corrompe
-- nada, pero frena el `db push` sin avisar antes.
--
-- Por eso el `UPDATE` sólo mueve las filas que NO chocan. Una fila que sí choca se queda con
-- `ambito='tasks'`: invisible en el desplegable (que sólo lista `operations`), pero intacta en
-- la tabla — nadie la borra. Es redundante a propósito: su dueño ya tiene la misma vista, con el
-- mismo nombre, funcionando del lado nuevo. Si alguna vez hace falta recuperarla (nombre
-- distinto, por ejemplo), sigue ahí con un `SELECT ... WHERE ambito = 'tasks'`.
UPDATE public.vistas_filtro AS v
SET ambito = 'operations'
WHERE v.ambito = 'tasks'
  AND NOT EXISTS (
    SELECT 1 FROM public.vistas_filtro AS v2
    WHERE v2.usuario_id = v.usuario_id
      AND v2.ambito = 'operations'
      AND v2.nombre = v.nombre
  );

COMMIT;
