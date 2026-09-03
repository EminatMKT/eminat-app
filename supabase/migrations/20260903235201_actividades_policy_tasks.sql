-- Las tareas se leen desde los dos módulos.
--
-- La extracción NO deja a Stratix sin dependencia de esta tabla: la sección Team se queda ahí
-- y `RosterCard` cuenta las tareas en proceso de cada persona. Con la policy gateada sólo por
-- `stratix-mkt`, quien tenga `tasks` y no Stratix vería el tablero vacío sin ningún error; con
-- ella gateada sólo por `tasks`, el contador de Team quedaría en cero para quien tenga Stratix
-- y no `tasks`. Las dos condiciones en OR es lo único que sirve a los dos módulos.
--
-- Si algún día Stratix se disuelve y Team se va al Directorio, esta policy vuelve a una sola
-- condición. Es la única decisión que queda abierta y no bloquea nada.
DO $$
DECLARE
  slug_tasks   text := 'tasks';
  slug_stratix text := 'stratix-mkt';
  cond         text;
BEGIN
  -- Los dos slugs verificados: `role_modules.module_slug` es text sin FK, y `has_module()` abre
  -- con `is_admin() OR …`, así que uno mal escrito da true para el admin —que es quien prueba
  -- la migración— y false en silencio para todo el resto.
  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug_tasks) THEN
    RAISE EXCEPTION 'slug de módulo desconocido: %', slug_tasks;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug_stratix) THEN
    RAISE EXCEPTION 'slug de módulo desconocido: %', slug_stratix;
  END IF;

  cond := format('(public.has_module(%L) OR public.has_module(%L))', slug_tasks, slug_stratix);

  -- La de lectura sigue llamándose `colaborador_read` (viene de la migración de roles dinámicos
  -- y renombrarla no compra nada): se reemplaza en su lugar.
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
END $$;
