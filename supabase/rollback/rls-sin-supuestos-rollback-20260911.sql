-- ROLLBACK de las tres migraciones del 11/09/2026:
--   20260911013928_es_personal_y_usuarios.sql
--   20260911014138_empresas_es_personal.sql
--   20260911014505_catalogos_es_personal.sql
--
-- CUÁNDO CORRER ESTO. Sólo si después de aplicar, gente legítima dejó de ver cosas: el
-- directorio vacío, el selector de empresa vacío, el panel de admin sin roles. La causa sería
-- que `es_personal()` devuelve false para usuarios que sí son del personal — típicamente porque
-- tienen `usuarios.auth_id` en NULL. Comprobalo antes de revertir, que es más rápido:
--
--   select id, email from public.usuarios where auth_id is null and activo;
--
-- Si esa consulta devuelve filas, el arreglo de fondo es rellenar esos `auth_id`, no revertir.
--
-- QUÉ DESHACE. Devuelve las diez policies a `using (true)` para `authenticated`, que es lo que
-- había antes. Con eso la app vuelve a funcionar para todo el mundo en el acto.
--
-- QUÉ **NO** DESHACE, A PROPÓSITO:
--
-- 1. Los `REVOKE ALL ... FROM anon`. Revertirlos volvería a dejar el directorio de personal
--    legible sin sesión con la llave del bundle, que es un agujero mayor que el que este
--    rollback viene a apagar. Ninguna pantalla de la app lee esas tablas sin sesión, así que
--    no revertirlos no rompe nada.
-- 2. La policy `Lectura pública de usuarios` (`{anon} using (true)`). Misma razón.
-- 3. La función `public.es_personal()`. Queda; es inerte si ninguna policy la usa, y si vas a
--    reaplicar las migraciones la vas a necesitar igual.
--
-- OJO CON EL GATE. Después de correr esto, `pnpm db:rls` va a FALLAR: el check
-- `policies-sin-qual-true.sql` encuentra exactamente las policies que este archivo restaura.
-- Es correcto que falle — estás en un estado que la regla prohíbe, a propósito y temporalmente.
-- Para pushear en ese intervalo, agregá los nombres al array `conocidas` de ese check en un
-- commit aparte que diga por qué, y borralos cuando el arreglo real entre.

begin;

-- --- usuarios ----------------------------------------------------------------
drop policy if exists "Lectura autenticada de usuarios" on public.usuarios;
create policy "Lectura autenticada de usuarios" on public.usuarios
  for select to authenticated using (true);

-- --- empresas ----------------------------------------------------------------
-- Producción tenía DOS policies antes del 11/09: `empresas_select_authenticated` (de este repo)
-- y `empresas_read_authenticated` (aplicada a mano, venía del schema.sql de stratix-meet). Se
-- restaura sólo la primera: con `using (true)` alcanza para que todo vuelva a verse, y la
-- segunda nunca debió existir.
drop policy if exists "empresas_read_personal" on public.empresas;
drop policy if exists "empresas_select_authenticated" on public.empresas;
create policy "empresas_select_authenticated" on public.empresas
  for select to authenticated using (true);

-- --- los ocho catálogos -------------------------------------------------------
-- Cada uno vuelve a su nombre original, que no seguía un criterio único: `roles` y
-- `role_modules` usaban `_read` y los otros seis `_select_authenticated`.
DO $mig$
DECLARE
  par text[];
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
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', par[1] || '_read_personal', par[1]);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', par[2], par[1]);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', par[2], par[1]);
    RAISE NOTICE 'revertida: %', par[1];
  END LOOP;
END $mig$;

-- El único guard que importa acá: que `authenticated` siga pudiendo leer. Si esto falla, el
-- problema nunca fue la policy y revertir no lo iba a arreglar.
DO $mig$
DECLARE mudas text;
BEGIN
  SELECT string_agg(t, ', ' ORDER BY t) INTO mudas
    FROM unnest(ARRAY['usuarios', 'empresas', 'cargos', 'departamentos', 'equipos', 'jornadas',
                      'roles', 'role_modules', 'usuario_cargos', 'vinculaciones']) t
   WHERE NOT has_table_privilege('authenticated', 'public.' || t, 'SELECT');
  IF mudas IS NOT NULL THEN
    RAISE EXCEPTION E'authenticated no tiene SELECT sobre: %.\n%', mudas,
      'Revertir las policies no alcanza: falta el GRANT. Corré '
      'GRANT SELECT ON public.<tabla> TO authenticated sobre las que faltan.';
  END IF;
END $mig$;

commit;
