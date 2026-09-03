-- El módulo `tasks` para la RLS. Sin esto el módulo existe para la app y no para Postgres:
-- `has_module('tasks')` da false, las listas vuelven vacías y no hay ningún error. Ya pasó.
--
-- Los roles NO se enumeran a mano: se copian de quién tiene `stratix-mkt` hoy. Es la garantía
-- de que nadie pierde acceso al tablero por esta fase — quien lo veía lo sigue viendo, ahora
-- por las dos puertas.
DO $$
DECLARE
  slug_nuevo text := 'tasks';
  slug_viejo text := 'stratix-mkt';
  copiados int;
BEGIN
  -- El slug viejo va en variable con su verificación por la misma razón de siempre:
  -- `role_modules.module_slug` es text sin FK, y uno mal escrito no falla — copiaría cero filas
  -- y dejaría el módulo mudo para todos menos el admin, que es quien prueba la migración.
  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug_viejo) THEN
    RAISE EXCEPTION 'slug de módulo desconocido: %', slug_viejo;
  END IF;

  INSERT INTO public.role_modules (role_key, module_slug)
  VALUES ('admin', slug_nuevo)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.role_modules (role_key, module_slug)
  SELECT role_key, slug_nuevo FROM public.role_modules WHERE module_slug = slug_viejo
  ON CONFLICT DO NOTHING;

  SELECT count(*) INTO copiados FROM public.role_modules WHERE module_slug = slug_nuevo;
  IF copiados = 0 THEN
    RAISE EXCEPTION 'ningún rol quedó con el módulo %', slug_nuevo;
  END IF;
END $$;
