-- FASE 1, PASO 1A: abre `operations` SIN cerrar `tasks`.
--
-- Migración y deploy son pasos separados en este proyecto, así que el slug no puede cambiar en la
-- base y en el bundle a la vez. Y los dos órdenes rompen: si la base cambia primero, el bundle
-- viejo pide `tasks`, `getModulesForRole` devuelve `operations` y su `isModuleSlug` lo rechaza —
-- el módulo desaparece del Launchpad y /tasks cae en AccessDenied, sin un solo error. Si el bundle
-- cambia primero, `has_module('operations')` da false porque no hay filas.
--
-- Por eso esta migración sólo AGREGA. La app vieja sigue funcionando igual: sus filas `tasks`
-- están intactas y las policies aceptan los dos slugs.
--
-- `admin` NO recibe fila: `getModulesForRole` corta por short-circuit y le da todos los módulos
-- tenga filas o no. Sembrarla sería data muerta — la convención está escrita en
-- 20260624210414_dynamic_roles.sql.
--
-- El reparto se re-resolvió contra prod el 09/09 (no contra local ni el spec):
--   select role_key from role_modules where module_slug = 'tasks' order by 1;
--   -> admin, stratix360
-- El INSERT de abajo es esa lista menos `admin`, por la razón de arriba.
BEGIN;

INSERT INTO public.role_modules (role_key, module_slug) VALUES
  ('stratix360', 'operations')
ON CONFLICT DO NOTHING;

DO $do$
DECLARE
  slug_nuevo   text := 'operations';
  slug_viejo   text := 'tasks';
  slug_stratix text := 'stratix-mkt';
  cond         text;
BEGIN
  -- Los tres slugs verificados. `role_modules.module_slug` es text sin FK y `has_module()` abre
  -- con `is_admin() OR …`, así que uno mal escrito da true para el admin —que es quien prueba la
  -- migración— y false en silencio para todo el resto.
  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug_nuevo) THEN
    RAISE EXCEPTION 'slug de módulo desconocido: %', slug_nuevo;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug_viejo) THEN
    RAISE EXCEPTION 'slug de módulo desconocido: %', slug_viejo;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug_stratix) THEN
    RAISE EXCEPTION 'slug de módulo desconocido: %', slug_stratix;
  END IF;

  cond := format('(public.has_module(%L) OR public.has_module(%L) OR public.has_module(%L))',
                 slug_nuevo, slug_viejo, slug_stratix);

  -- La de lectura sigue llamándose `colaborador_read` (viene de los roles dinámicos y renombrarla
  -- no compra nada): se reemplaza en su lugar.
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

COMMIT;
