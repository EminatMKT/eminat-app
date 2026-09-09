-- Rollback de la fase 1 de `operations` (las migraciones _abre y _cierra).
-- Devuelve el slug `tasks` y deja las policies como estaban. NO borra datos.
BEGIN;

-- 1. Las filas. `admin` recupera la suya porque en prod la tenía (repuesta desde /admin), aunque
--    la convención diga que no debería.
INSERT INTO public.role_modules (role_key, module_slug) VALUES
  ('admin', 'tasks'),
  ('stratix360', 'tasks')
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

-- 3. El ámbito de los filtros.
UPDATE public.vistas_filtro SET ambito = 'tasks' WHERE ambito = 'operations';

COMMIT;
