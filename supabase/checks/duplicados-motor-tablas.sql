DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'duplicados_entidades') THEN
    RAISE EXCEPTION 'duplicados_entidades is missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.duplicados_entidades WHERE entidad = 'pacientes' AND tabla = 'pacientes' AND modulo = 'medical') THEN
    RAISE EXCEPTION 'seed row for pacientes is missing in duplicados_entidades';
  END IF;
  IF (SELECT hijos FROM public.duplicados_entidades WHERE entidad = 'pacientes') <>
     '[{"tabla":"paciente_fuentes","columna":"paciente_id"},{"tabla":"paciente_contactos","columna":"paciente_id"}]'::jsonb THEN
    RAISE EXCEPTION 'hijos of the pacientes seed row does not match';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname IN
      ('duplicados_entidades','duplicados_pendientes','duplicados_descartes','duplicados_fusiones')
      AND NOT c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'some table of the dedup engine does not have RLS enabled';
  END IF;
  IF has_table_privilege('authenticated', 'public.duplicados_entidades', 'INSERT') THEN
    RAISE EXCEPTION 'authenticated should not be able to INSERT into duplicados_entidades';
  END IF;
  IF NOT has_table_privilege('authenticated', 'public.duplicados_pendientes', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated should be able to SELECT from duplicados_pendientes';
  END IF;
END $$;
