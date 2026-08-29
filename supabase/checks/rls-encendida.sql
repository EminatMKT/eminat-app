-- Toda tabla de `public` tiene que tener RLS ENCENDIDA.
--
-- Por qué existe este archivo: el 29/08/2026 se descubrió que `actividades`, `usuarios`,
-- `historial` y `notificaciones` corrían en producción con `relrowsecurity = false`. Las policies
-- estaban escritas —seis en total, revisadas y mergeadas— y Postgres nunca las evaluó: con RLS
-- apagada no se miran. Nadie lo notó porque no hay error, ni test en rojo, ni build roto. Una
-- tabla sin RLS no falla: funciona de más.
--
-- Corre contra el Supabase LOCAL (`pnpm db:rls`), en pre-push y en el job e2e del CI.
--
-- La regla y su motivo viven en rules/base-de-datos.md · "Una tabla nace con RLS encendida".

DO $$
DECLARE
  -- DEUDA VISIBLE: cada nombre acá es una tabla desprotegida. Se arregla borrando el nombre,
  -- nunca agregándolo.
  --
  -- Está VACÍA desde el 29/08/2026: las cuatro que la estrenaron —actividades, usuarios,
  -- historial, notificaciones— se arreglaron en la migración
  -- `20260829210325_rls_encendida_cuatro_tablas.sql`. Que quede vacía es el estado correcto.
  conocidas text[] := ARRAY[]::text[];
  culpables text;
BEGIN
  SELECT string_agg(c.relname, ', ' ORDER BY c.relname) INTO culpables
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND NOT c.relrowsecurity
    AND NOT (c.relname = ANY (conocidas));

  IF culpables IS NOT NULL THEN
    RAISE EXCEPTION E'Tablas de public sin RLS: %\n\n%',
      culpables,
      'Una tabla sin RLS queda legible y escribible por cualquiera que tenga la llave '
      'publishable, que viaja en el bundle del browser. Agregá ENABLE ROW LEVEL SECURITY y su '
      'policy en la misma migración que crea la tabla. Ver rules/base-de-datos.md.';
  END IF;
END $$;

-- La otra mitad: una tabla CON RLS y SIN ninguna policy es invisible para todos menos
-- service_role. No es un agujero, pero casi siempre es un olvido — y se ve igual que una tabla
-- que anda bien hasta que alguien reporta que no ve nada.
DO $$
DECLARE
  mudas text;
BEGIN
  SELECT string_agg(c.relname, ', ' ORDER BY c.relname) INTO mudas
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity
    AND NOT EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname = 'public' AND p.tablename = c.relname
    );

  IF mudas IS NOT NULL THEN
    RAISE WARNING 'Tablas con RLS y sin ninguna policy (mudas para todos menos service_role): %',
      mudas;
  END IF;
END $$;
