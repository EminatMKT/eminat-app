-- Proves the multi-table functions are atomic and declare their concurrency strategy.
-- Runs inside one transaction and rolls back: it leaves no data behind.
-- The two-session lock test lives in transacciones.sh (it needs a second connection).
BEGIN;

DO $$
DECLARE
  act        uuid;
  version    timestamptz;
  titulo_era text;
  dos        uuid[];
  modulos    text[];
BEGIN
  SELECT id, updated_at, titulo INTO act, version, titulo_era FROM public.actividades LIMIT 1;
  SELECT array_agg(id) INTO dos FROM (SELECT id FROM public.usuarios WHERE activo LIMIT 2) u;

  -- 1. Stale version: optimistic conflict, nothing written.
  BEGIN
    PERFORM public.update_meet_activity(act, version - interval '1 second', '{"titulo":"stale"}'::jsonb);
    RAISE EXCEPTION 'FAIL 1: a stale version was accepted';
  EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL;
  END;
  IF (SELECT titulo FROM public.actividades WHERE id = act) <> titulo_era THEN
    RAISE EXCEPTION 'FAIL 1: the stale call changed the title';
  END IF;

  -- 2. Atomic: an invalid responsible set rolls the column change back too.
  BEGIN
    PERFORM public.update_meet_activity(act, version, '{"titulo":"half"}'::jsonb, dos, gen_random_uuid(), true);
    RAISE EXCEPTION 'FAIL 2: a leader outside the set was accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  IF (SELECT titulo FROM public.actividades WHERE id = act) <> titulo_era THEN
    RAISE EXCEPTION 'FAIL 2: the title was saved although the responsibles failed';
  END IF;

  -- 3. Happy path: columns and responsibles land together and the version moves.
  PERFORM public.update_meet_activity(act, version, '{"titulo":"both"}'::jsonb, dos, dos[1], true);
  IF (SELECT titulo FROM public.actividades WHERE id = act) <> 'both'
     OR (SELECT count(*) FROM public.actividad_responsables WHERE actividad_id = act) <> 2 THEN
    RAISE EXCEPTION 'FAIL 3: columns and responsibles did not land together';
  END IF;

  -- 4. Roles: a failing module insert rolls the label back.
  SELECT array_agg(module_slug) INTO modulos FROM public.role_modules LIMIT 1;
  PERFORM public.save_role('check_role', 'Check role', ARRAY[]::text[], true);
  BEGIN
    PERFORM public.save_role('check_role', 'Renamed', ARRAY['tasks', 'tasks'], false);
    RAISE EXCEPTION 'FAIL 4: duplicated modules were accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  IF (SELECT label FROM public.roles WHERE key = 'check_role') <> 'Check role' THEN
    RAISE EXCEPTION 'FAIL 4: the label was saved although the modules failed';
  END IF;

  -- 5. Roles: creating an existing key is a conflict, not a second row.
  BEGIN
    PERFORM public.save_role('check_role', 'Other label', ARRAY[]::text[], true);
    RAISE EXCEPTION 'FAIL 5: a duplicate role was created';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  RAISE NOTICE 'transacciones: 5 checks OK';
END;
$$;

ROLLBACK;
