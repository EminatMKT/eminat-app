-- Ninguna policy permisiva para `anon` o `authenticated` puede tener el predicado `true`.
--
-- Por qué existe este archivo: el 10/09/2026 se encontró que `usuarios` (17 filas, 25 columnas),
-- `empresas` y ocho catálogos —incluido `role_modules`, que dice qué módulos toca cada rol— se
-- abrían a cualquier sesión `authenticated` con `using (true)`. Eso fue correcto mientras el
-- único emisor de sesiones fuera nuestro login, que valida el dominio del correo. Dejó de serlo
-- cuando una segunda aplicación sobre el MISMO proyecto de Supabase empezó a registrar a
-- cualquiera con `signInWithOtp`.
--
-- Lo que hace a esto distinto de un bug común: el agujero no se abrió tocando la base. Se abrió
-- cambiando quién podía sacar una sesión, que es una decisión que puede tomar alguien sin acceso
-- a este repo, en otro deploy, sin avisar. Por eso la defensa no puede vivir en el login.
--
-- La regla: una policy autoriza por una propiedad de la PERSONA —`is_admin()`, `has_module()`,
-- `es_personal()`, o la relación con la fila—, nunca por el hecho de tener sesión.
--
-- Corre contra el Supabase LOCAL (`pnpm db:rls`), en pre-push y en el job e2e del CI.
--
-- La regla y su motivo viven en rules/base-de-datos.md · "Una policy no autoriza por tener sesión".

DO $$
DECLARE
  -- DEUDA VISIBLE: cada nombre acá es una policy que autoriza por tener sesión. Se arregla
  -- borrando el nombre, nunca agregándolo.
  --
  -- Nace VACÍA, el 11/09/2026: las diez que la habrían estrenado se arreglaron en las
  -- migraciones `20260911013928`, `20260911014138` y `20260911014505`. Que quede vacía es el
  -- estado correcto.
  conocidas text[] := ARRAY[]::text[];
  culpables text;
BEGIN
  SELECT string_agg(format('%s.%s', p.tablename, p.policyname), E'\n  ' ORDER BY p.tablename, p.policyname)
    INTO culpables
    FROM pg_policies p
   WHERE p.schemaname = 'public'
     AND p.permissive = 'PERMISSIVE'
     -- `public` va en la lista porque en Postgres incluye a `anon` y a `authenticated`: una
     -- policy sin cláusula `TO` queda en `public` y es tan abierta como una dirigida a ellos.
     AND p.roles && ARRAY['anon', 'authenticated', 'public']::name[]
     -- Cada mitad se mira SÓLO donde manda. Una policy de INSERT tiene `qual` en NULL SIEMPRE
     -- —sólo usa `with_check`—, así que tratar ese NULL como `true` rechazaba INSERTs
     -- perfectamente escritos. Lo verificó un canario el 11/09:
     -- `FOR INSERT TO authenticated WITH CHECK (is_admin())` daba culpable.
     AND (
       (p.cmd IN ('SELECT', 'UPDATE', 'DELETE', 'ALL') AND btrim(coalesce(p.qual, 'true')) = 'true')
       OR
       (p.cmd IN ('INSERT', 'UPDATE', 'ALL') AND btrim(p.with_check) = 'true')
     )
     AND NOT (format('%s.%s', p.tablename, p.policyname) = ANY (conocidas));

  IF culpables IS NOT NULL THEN
    RAISE EXCEPTION E'Policies que autorizan por tener sesión:\n  %\n\n%',
      culpables,
      'Una policy `using (true)` sobre `anon`/`authenticated` delega la seguridad en quién puede '
      'registrarse en el proyecto Supabase, y eso se decide fuera de este repo. Calificá por una '
      'propiedad de la persona: es_personal(), has_module(), is_admin(), o la relación con la '
      'fila. Ver rules/base-de-datos.md.';
  END IF;
END $$;

-- La otra mitad, y la que impide el falso verde: una tabla se puede "cerrar" revocándole el
-- GRANT a `authenticated` en vez de calificar la policy. El check de arriba daría verde y la app
-- estaría rota para todo el mundo. Estas cinco son las que el login necesita sí o sí.
DO $$
DECLARE
  mudas text;
BEGIN
  SELECT string_agg(t, ', ' ORDER BY t)
    INTO mudas
    FROM unnest(ARRAY['usuarios', 'empresas', 'roles', 'role_modules', 'usuario_cargos']) t
   WHERE to_regclass('public.' || t) IS NOT NULL
     AND NOT has_table_privilege('authenticated', 'public.' || t, 'SELECT');

  IF mudas IS NOT NULL THEN
    RAISE EXCEPTION 'authenticated perdió el SELECT sobre: %. La app no arranca sin esas lecturas.',
      mudas;
  END IF;
END $$;
