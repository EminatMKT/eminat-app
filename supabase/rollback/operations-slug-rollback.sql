-- Rollback de la fase 1 de `operations` (las migraciones _abre y _cierra).
-- Devuelve el slug `tasks` y deja las policies como estaban. NO borra datos.
BEGIN;

-- 1. Las filas. El cierre (20260909233746) borró `tasks` por `module_slug`, no por una lista de
--    roles — por eso repone por el mismo criterio en espejo: `tasks` recupera exactamente los
--    roles que a ese momento tengan `operations`, sea cual sea ese conjunto. Una lista fija
--    escrita hoy (`admin`, `stratix360`) es la reincidencia del mismo bug que esta corrección
--    arregla: si alguien le da `operations` a un rol nuevo desde /admin durante la convivencia,
--    ese rol tiene fila de `operations`, el cierre nunca la toca, y una lista congelada en este
--    archivo lo deja sin nada al revertir — el defecto original, con los nombres cambiados.
--
--    `base-de-datos.md` pide enumerar a quién se reparte un permiso y no copiarlo con un SELECT,
--    para que el diff de una migración diga quién queda con qué. Acá leo que no aplica igual:
--    el check de esa regla sólo mira `supabase/migrations/` (no este archivo), y la razón de
--    fondo tampoco calza — esto no reparte un permiso nuevo que alguien decide en un PR, restituye
--    el que había, y el conjunto correcto ("quien tenga `operations` ahora") no existe todavía ni
--    cuando se escribe este archivo ni cuando se revisa el PR: sólo en el momento en que alguien
--    decide correrlo, a mano, meses después tal vez. Congelarlo acá sería fijar una respuesta a
--    una pregunta que todavía no se hizo. Si esta lectura no convence, la corrijo — quedó para que
--    Wagner decida.
--
--    Visibilidad en vez de lista fija: quien vaya a correr esto corre primero el precheck de abajo
--    y mira la lista antes de confirmar, igual que el precheck de colisión de la sección 3.
--
--    PRECHECK — antes de correr este rollback, como `db query --linked`:
--
--      SELECT role_key FROM public.role_modules WHERE module_slug = 'operations' ORDER BY 1;
--
--    `admin` es aparte y va con INSERT propio: nunca tiene fila de `operations` (corta por
--    `is_admin()`, sembrarla sería data muerta — así lo deja 20260909222149) pero en prod SÍ
--    tenía fila de `tasks` desde antes de esa convención (el precheck de esa misma migración lo
--    muestra: `admin, stratix360`). El SELECT de abajo no puede reponerla porque no hay de dónde
--    copiarla — no es una excepción a la regla de arriba, es el caso que ni el SELECT ni una
--    lista podrían resolver solos.
INSERT INTO public.role_modules (role_key, module_slug) VALUES
  ('admin', 'tasks')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_modules (role_key, module_slug)
SELECT role_key, 'tasks' FROM public.role_modules WHERE module_slug = 'operations'
ON CONFLICT DO NOTHING;

DELETE FROM public.role_modules WHERE module_slug = 'operations';

-- 2. Las policies de `actividades`, exactamente como las dejó 20260903235201.
DO $do$
DECLARE
  slug_tasks   text := 'tasks';
  slug_stratix text := 'stratix-mkt';
  cond         text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug_tasks) THEN
    RAISE EXCEPTION 'slug de módulo desconocido: %', slug_tasks;
  END IF;
  cond := format('(public.has_module(%L) OR public.has_module(%L))', slug_tasks, slug_stratix);

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

-- 3. El ámbito de los filtros. `vistas_filtro` tiene `UNIQUE (usuario_id, ambito, nombre)`
--    (20260904221516). El cierre movió `tasks` → `operations` con un `NOT EXISTS` que a propósito
--    DEJÓ atrás las filas que chocaban por nombre (ver su comentario, sección final) — o sea que
--    hoy pueden convivir una vista "Mis pendientes" en `operations` (la movida) y otra homónima
--    que se quedó en `tasks` porque ya existía su gemela. Sin la misma guarda en espejo, este
--    UPDATE intenta mover TODO `operations` de vuelta a `tasks`, choca contra esas filas que
--    nunca se fueron de `tasks`, viola el UNIQUE y aborta la transacción entera — el rollback
--    fallaría justo cuando más se lo necesita.
--
--    Por eso el UPDATE de abajo sólo mueve las filas de `operations` que NO chocan. Una fila que
--    sí choca se queda con `ambito = 'operations'`: invisible en el desplegable de `tasks` (que
--    sólo lista `tasks`), pero intacta en la tabla — nadie la borra. Es redundante a propósito:
--    su dueño ya tiene la misma vista, con el mismo nombre, funcionando del lado `tasks` (la que
--    el cierre nunca movió). Si hace falta recuperarla igual, sigue ahí con un
--    `SELECT ... WHERE ambito = 'operations'`.
UPDATE public.vistas_filtro AS v
SET ambito = 'tasks'
WHERE v.ambito = 'operations'
  AND NOT EXISTS (
    SELECT 1 FROM public.vistas_filtro AS v2
    WHERE v2.usuario_id = v.usuario_id
      AND v2.ambito = 'tasks'
      AND v2.nombre = v.nombre
  );

COMMIT;
