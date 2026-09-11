-- Los ocho catálogos que quedaban abiertos por tener sesión. Tercera y última parte de
-- `20260911013928_es_personal_y_usuarios.sql`; el motivo completo está ahí.
--
-- QUÉ LEÍA UN FORASTERO. Con `usuarios` y `empresas` ya cerradas, una sesión sin fila en
-- `usuarios` todavía leía el organigrama entero (`cargos`, `departamentos`, `equipos`,
-- `jornadas`, `vinculaciones`), quién ocupa qué cargo por uuid (`usuario_cargos`) y —lo más
-- útil para alguien de afuera— el modelo de permisos completo: qué roles existen y qué módulos
-- toca cada uno (`roles`, `role_modules`). No son datos personales; es reconocimiento.
--
-- POR QUÉ NO ROMPE. Las ocho se leen en dos lugares y ninguno es anónimo: el cliente las carga
-- en `loadAppData`, que corre después del login, y las rutas `src/app/api/admin/*` usan
-- `service_role`, que saltea la RLS por completo. Las ocho tenían además `anon SELECT = true`
-- en local, por los DEFAULT PRIVILEGES de `public` que ya denunció `20260831214348`.
--
-- El bloque va etiquetado `$mig$` y no `$$`: con `format()` adentro, el `$$` pelado cierra por
-- longest match y el DO no compila.

DO $mig$
DECLARE
  par text[];
  -- (tabla, policy que hoy dice `using (true)`). La policy nueva se llama <tabla>_read_personal
  -- en las ocho: los nombres viejos no seguían un criterio único y eso ya costó una vez.
  pares text[] := ARRAY[
    ARRAY['cargos',         'cargos_select_authenticated'],
    ARRAY['departamentos',  'departamentos_select_authenticated'],
    ARRAY['equipos',        'equipos_select_authenticated'],
    ARRAY['jornadas',       'jornadas_select_authenticated'],
    ARRAY['roles',          'roles_read'],
    ARRAY['role_modules',   'role_modules_read'],
    ARRAY['usuario_cargos', 'usuario_cargos_select_authenticated'],
    ARRAY['vinculaciones',  'vinculaciones_select_authenticated']
  ];
BEGIN
  FOREACH par SLICE 1 IN ARRAY pares LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', par[2], par[1]);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.es_personal())',
      par[1] || '_read_personal', par[1]);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', par[1]);
    RAISE NOTICE 'calificada y revocada: %', par[1];
  END LOOP;
END $mig$;

-- Los guards, con el mismo criterio de las dos migraciones anteriores.
DO $mig$
DECLARE
  tabla text;
  abiertas text;
  quedan text;
BEGIN
  FOREACH tabla IN ARRAY ARRAY['cargos', 'departamentos', 'equipos', 'jornadas', 'roles',
                               'role_modules', 'usuario_cargos', 'vinculaciones'] LOOP
    IF NOT has_table_privilege('authenticated', 'public.' || tabla, 'SELECT') THEN
      RAISE EXCEPTION 'authenticated perdió el SELECT sobre %: el catálogo queda muerto', tabla;
    END IF;
  END LOOP;

  SELECT string_agg(distinct table_name || ':' || privilege_type, ', ')
    INTO quedan
    FROM information_schema.role_table_grants
   WHERE table_schema = 'public' AND grantee = 'anon'
     AND table_name = ANY (ARRAY['cargos', 'departamentos', 'equipos', 'jornadas', 'roles',
                                 'role_modules', 'usuario_cargos', 'vinculaciones']);
  IF quedan IS NOT NULL THEN
    RAISE EXCEPTION 'anon todavía tiene privilegios sobre los catálogos: %', quedan;
  END IF;

  -- Acotado a las ocho tablas de esta migración, y NO a todo `public`, porque el esquema no es
  -- sólo nuestro: stratix-meet vive en el mismo proyecto de producción y dejó ahí `profiles`,
  -- con su policy abierta y sin migración en ningún repo. Un guard global hacía que una tabla
  -- ajena abortara una migración que había hecho su trabajo — pasó el 11/09/2026, en el primer
  -- `db push`. Quién barre TODO `public` es `supabase/checks/policies-sin-qual-true.sql`, en el
  -- pre-push y el CI, que corren contra local, donde esas tablas no existen.
  SELECT string_agg(tablename || '.' || policyname, ', ' ORDER BY tablename, policyname)
    INTO abiertas
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename = ANY (ARRAY['cargos', 'departamentos', 'equipos', 'jornadas', 'roles',
                                'role_modules', 'usuario_cargos', 'vinculaciones'])
     AND permissive = 'PERMISSIVE'
     AND roles && ARRAY['anon', 'authenticated']::name[]
     AND (btrim(coalesce(qual, 'true')) = 'true' OR btrim(coalesce(with_check, '')) = 'true');
  IF abiertas IS NOT NULL THEN
    RAISE EXCEPTION E'Todavía hay policies que autorizan por tener sesión:\n  %', abiertas;
  END IF;
END $mig$;
