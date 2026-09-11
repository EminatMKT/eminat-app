-- `empresas` deja de abrirse por el solo hecho de tener una sesión. Segunda mitad de
-- `20260911013928_es_personal_y_usuarios.sql`; el motivo completo está ahí.
--
-- DOS POLICIES, LAS DOS `true`. Producción tiene `empresas_select_authenticated` (nuestra) y
-- `empresas_read_authenticated`, que NO salió de este repo: vino textual del `schema.sql` de
-- `stratix-meet`, donde estaba como instrucción en un comentario, y se aplicó a mano en el SQL
-- Editor el 10/09/2026. Local sólo tiene la primera. Las dos declaran `using (true)`, y las
-- permisivas se suman con OR: arreglar una sola no habría cambiado nada.
--
-- Se borran las dos y queda UNA. Tener dos policies que dicen lo mismo era, además, la razón por
-- la que la de más se coló sin que nadie lo notara.
--
-- QUIÉN LA LEE: `src/shared/data/org.ts:19` vía `loadAppData`, que corre después del login — o
-- sea siempre con fila en `usuarios`. Nada la lee sin sesión, y por eso el REVOKE a `anon` no
-- rompe nada; en local `anon` tenía SELECT, igual que sobre `usuarios`.

drop policy if exists "empresas_read_authenticated" on public.empresas;
drop policy if exists "empresas_select_authenticated" on public.empresas;

create policy "empresas_read_personal" on public.empresas
  for select to authenticated using (public.es_personal());

revoke all on public.empresas from anon;

-- Los dos guards, con el mismo criterio que la migración anterior: que a `anon` no le quede
-- nada, y que `authenticated` no haya perdido la lectura — sin ella el selector de empresa del
-- panel de admin queda vacío y no hay error que lo diga.
DO $$
DECLARE quedan text;
BEGIN
  SELECT string_agg(distinct privilege_type, ', ')
    INTO quedan
    FROM information_schema.role_table_grants
   WHERE table_schema = 'public' AND table_name = 'empresas' AND grantee = 'anon';
  IF quedan IS NOT NULL THEN
    RAISE EXCEPTION 'anon todavía tiene privilegios sobre empresas: %', quedan;
  END IF;

  IF NOT has_table_privilege('authenticated', 'public.empresas', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated perdió el SELECT sobre empresas: el catálogo queda muerto';
  END IF;
END $$;

-- Y que no haya quedado ninguna otra policy de SELECT abierta sobre la tabla: el objetivo de
-- esta migración es que quede UNA, no que se sumen tres.
DO $$
DECLARE abiertas text;
BEGIN
  SELECT string_agg(policyname, ', ' ORDER BY policyname)
    INTO abiertas
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'empresas'
     AND cmd IN ('SELECT', 'ALL')
     AND btrim(coalesce(qual, 'true')) = 'true';
  IF abiertas IS NOT NULL THEN
    RAISE EXCEPTION 'empresas todavía tiene policies sin calificar: %', abiertas;
  END IF;
END $$;
