\set ON_ERROR_STOP on
BEGIN;

-- Each presence probe can also run separately to prove both pre-migration REDs.
SELECT 'public.decidir_descarte_duplicado(text,uuid,uuid,text,text)'::regprocedure;
SELECT 'public.deshacer_descarte_duplicado(text,uuid,uuid)'::regprocedure;

INSERT INTO public.roles (key, label) VALUES
  ('d06_allowed', 'Discard check allowed'), ('d06_denied', 'Discard check denied');
INSERT INTO public.role_modules (role_key, module_slug) VALUES ('d06_allowed', 'medical');
INSERT INTO auth.users (id, email) VALUES
  ('d0600000-0000-0000-0000-000000000101', 'd06-allowed@example.invalid'),
  ('d0600000-0000-0000-0000-000000000102', 'd06-denied@example.invalid'),
  ('d0600000-0000-0000-0000-000000000103', 'd06-other@example.invalid');
-- Application IDs intentionally differ from JWT subjects: the audit FK targets usuarios.id.
INSERT INTO public.usuarios (id, auth_id, email, nombre, apellido, rol) VALUES
  ('d0600000-0000-0000-0000-000000000201', 'd0600000-0000-0000-0000-000000000101',
   'd06-allowed@example.invalid', 'Discard', 'Allowed', 'd06_allowed'),
  ('d0600000-0000-0000-0000-000000000202', 'd0600000-0000-0000-0000-000000000102',
   'd06-denied@example.invalid', 'Discard', 'Denied', 'd06_denied'),
  ('d0600000-0000-0000-0000-000000000203', 'd0600000-0000-0000-0000-000000000103',
   'd06-other@example.invalid', 'Discard', 'Other', 'd06_allowed');
-- Explicit MRNs avoid advancing the nontransactional sequence.
INSERT INTO public.pacientes (id, mrn, nombre, apellido) VALUES
  ('d0600000-0000-0000-0000-000000000001', 'D06-CHECK-1', 'Discard', 'One'),
  ('d0600000-0000-0000-0000-000000000002', 'D06-CHECK-2', 'Discard', 'Two'),
  ('d0600000-0000-0000-0000-000000000003', 'D06-CHECK-3', 'Discard', 'Three');
INSERT INTO public.duplicados_entidades (entidad, tabla, modulo, funcion_candidatos) VALUES
  ('d06_users', 'usuarios', 'medical', 'unused_check'),
  ('d06_forbidden', 'missing_domain_table', 'd06_missing_module', 'unused_check');

CREATE FUNCTION pg_temp.assert_rejected(p_sql text, p_state text, p_message text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_state text;
  v_message text;
BEGIN
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_message = MESSAGE_TEXT;
  END;
  -- A successful call must not be swallowed by the exception handler.
  IF v_state IS DISTINCT FROM p_state OR v_message IS DISTINCT FROM p_message THEN
    RAISE EXCEPTION 'Expected % / %, got % / %', p_state, p_message, v_state, v_message;
  END IF;
END $$;

CREATE FUNCTION pg_temp.assert_pair_lock(p_entity text, p_first uuid, p_second uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_key bigint := hashtext(p_entity || '|' || p_first::text || '|' || p_second::text)::bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_locks WHERE locktype = 'advisory'
      AND pid = pg_backend_pid() AND granted AND mode = 'ExclusiveLock'
      AND classid::bigint = ((v_key >> 32) & 4294967295)
      AND objid::bigint = (v_key & 4294967295) AND objsubid = 1) THEN
    RAISE EXCEPTION 'Missing registrar-compatible pair lock for %', p_entity;
  END IF;
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'd0600000-0000-0000-0000-000000000101', true);
DO $$
DECLARE
  v_first uuid := 'd0600000-0000-0000-0000-000000000001';
  v_second uuid := 'd0600000-0000-0000-0000-000000000002';
BEGIN
  IF public.is_admin() IS NOT FALSE OR public.has_module('medical') IS NOT TRUE
     OR public.usuario_actual_id() IS NOT DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Fixture requires a real non-admin and distinct application/auth IDs';
  END IF;
  PERFORM public.registrar_candidato_duplicado('pacientes', v_first, v_second, 'exacta', 'import');
  PERFORM public.decidir_descarte_duplicado('pacientes', v_second, v_first, 'no_son_la_misma', NULL);
  IF EXISTS (SELECT 1 FROM public.duplicados_pendientes
      WHERE entidad = 'pacientes' AND item_id_a = v_first AND item_id_b = v_second)
     OR NOT EXISTS (SELECT 1 FROM public.duplicados_descartes
      WHERE entidad = 'pacientes' AND item_id_a = v_first AND item_id_b = v_second
        AND motivo = 'no_son_la_misma' AND nota IS NULL
        AND decidido_por = 'd0600000-0000-0000-0000-000000000201') THEN
    RAISE EXCEPTION 'Reversed discard must replace pending with normalized, app-audited discard';
  END IF;
END $$;

RESET ROLE;
-- now() is stable within a transaction, so age the fixture before testing preservation.
UPDATE public.duplicados_descartes SET decidido_at = now() - interval '1 day'
  WHERE entidad = 'pacientes' AND item_id_a = 'd0600000-0000-0000-0000-000000000001'
    AND item_id_b = 'd0600000-0000-0000-0000-000000000002';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'd0600000-0000-0000-0000-000000000103', true);
DO $$
DECLARE
  v_first uuid := 'd0600000-0000-0000-0000-000000000001';
  v_second uuid := 'd0600000-0000-0000-0000-000000000002';
  v_before jsonb;
BEGIN
  SELECT to_jsonb(d) INTO v_before FROM public.duplicados_descartes d
    WHERE entidad = 'pacientes' AND item_id_a = v_first AND item_id_b = v_second;
  IF (v_before->>'decidido_at')::timestamptz IS DISTINCT FROM now() - interval '1 day' THEN
    RAISE EXCEPTION 'Idempotency fixture must have an aged timestamp';
  END IF;
  PERFORM public.decidir_descarte_duplicado('pacientes', v_first, v_second,
    'son_la_misma_separadas', 'A later actor must not overwrite the first decision');
  IF v_before IS DISTINCT FROM (SELECT to_jsonb(d) FROM public.duplicados_descartes d
      WHERE entidad = 'pacientes' AND item_id_a = v_first AND item_id_b = v_second) THEN
    RAISE EXCEPTION 'Repeated decision changed initial metadata';
  END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', 'd0600000-0000-0000-0000-000000000101', true);
DO $$
DECLARE
  v_first uuid := 'd0600000-0000-0000-0000-000000000001';
  v_second uuid := 'd0600000-0000-0000-0000-000000000002';
  v_third uuid := 'd0600000-0000-0000-0000-000000000003';
  v_missing uuid := 'd0600000-0000-0000-0000-000000000099';
  v_note text;
  v_before jsonb;
  v_case record;
BEGIN
  PERFORM public.registrar_candidato_duplicado('pacientes', v_first, v_third, 'parcial', 'escaneo');
  SELECT to_jsonb(p) INTO v_before FROM public.duplicados_pendientes p
    WHERE entidad = 'pacientes' AND item_id_a = v_first AND item_id_b = v_third;
  FOREACH v_note IN ARRAY ARRAY[NULL, '', '   ', E'\t\n\r']::text[] LOOP
    PERFORM pg_temp.assert_rejected(format('SELECT public.decidir_descarte_duplicado(%L,%L,%L,%L,%L)',
      'pacientes', v_first, v_third, 'son_la_misma_separadas', v_note),
      '22023', 'Keeping the same item separate requires a nonblank note');
  END LOOP;
  FOR v_case IN SELECT * FROM (VALUES
    ('pacientes', v_first, v_third, 'invalid', '22023', 'Unknown duplicate discard motive'),
    ('pacientes', v_first, v_third, NULL, '22004', 'Duplicate discard inputs must not be null'),
    ('pacientes', v_first, v_first, 'no_son_la_misma', '22023', 'Duplicate candidate IDs must differ'),
    ('pacientes', v_first, v_missing, 'no_son_la_misma', '22023', 'Both duplicate candidate rows must exist'),
    ('pacientes', v_missing, v_second, 'no_son_la_misma', '22023', 'Both duplicate candidate rows must exist'),
    ('unknown_d06', v_first, v_second, 'no_son_la_misma', '22023', 'Unknown duplicate entity'),
    ('d06_forbidden', v_first, v_second, 'no_son_la_misma', '42501', 'Duplicate entity module access denied'),
    (NULL, v_first, v_second, 'no_son_la_misma', '22004', 'Duplicate discard inputs must not be null'),
    ('pacientes', NULL, v_second, 'no_son_la_misma', '22004', 'Duplicate discard inputs must not be null'),
    ('pacientes', v_first, NULL, 'no_son_la_misma', '22004', 'Duplicate discard inputs must not be null')
  ) AS cases(entity, first_id, second_id, motive, state, message) LOOP
    PERFORM pg_temp.assert_rejected(format('SELECT public.decidir_descarte_duplicado(%L,%L,%L,%L,NULL)',
      v_case.entity, v_case.first_id, v_case.second_id, v_case.motive), v_case.state, v_case.message);
  END LOOP;
  IF v_before IS DISTINCT FROM (SELECT to_jsonb(p) FROM public.duplicados_pendientes p
      WHERE entidad = 'pacientes' AND item_id_a = v_first AND item_id_b = v_third)
     OR EXISTS (SELECT 1 FROM public.duplicados_descartes
      WHERE entidad = 'pacientes' AND item_id_a = v_first AND item_id_b = v_third) THEN
    RAISE EXCEPTION 'Invalid decision lost pending data or created a phantom discard';
  END IF;
  PERFORM public.decidir_descarte_duplicado('pacientes', v_third, v_first,
    'son_la_misma_separadas', 'Separate clinical records are intentional');
  IF NOT EXISTS (SELECT 1 FROM public.duplicados_descartes
      WHERE entidad = 'pacientes' AND item_id_a = v_first AND item_id_b = v_third
        AND motivo = 'son_la_misma_separadas' AND nota = 'Separate clinical records are intentional') THEN
    RAISE EXCEPTION 'Valid separate-record motive failed';
  END IF;

  -- This pair was not registered first, so its lock can only come from discard.
  PERFORM public.decidir_descarte_duplicado('d06_users',
    'd0600000-0000-0000-0000-000000000203', 'd0600000-0000-0000-0000-000000000201', 'no_son_la_misma', NULL);
  PERFORM pg_temp.assert_pair_lock('d06_users',
    'd0600000-0000-0000-0000-000000000201', 'd0600000-0000-0000-0000-000000000203');
  PERFORM public.deshacer_descarte_duplicado('pacientes', v_second, v_first);
  IF EXISTS (SELECT 1 FROM public.duplicados_descartes
      WHERE entidad = 'pacientes' AND item_id_a = v_first AND item_id_b = v_second)
     OR EXISTS (SELECT 1 FROM public.duplicados_pendientes
      WHERE entidad = 'pacientes' AND item_id_a = v_first AND item_id_b = v_second) THEN
    RAISE EXCEPTION 'Undo must remove discard without recreating pending';
  END IF;
  PERFORM pg_temp.assert_rejected(format('SELECT public.deshacer_descarte_duplicado(%L,%L,%L)',
    'pacientes', v_second, v_first), '22023', 'Duplicate candidate pair was not discarded');
  PERFORM public.registrar_candidato_duplicado('pacientes', v_second, v_first, 'exacta', 'alta_manual');
  IF NOT EXISTS (SELECT 1 FROM public.duplicados_pendientes
      WHERE entidad = 'pacientes' AND item_id_a = v_first AND item_id_b = v_second) THEN
    RAISE EXCEPTION 'Redetection after undo must recreate pending';
  END IF;
  FOR v_case IN SELECT * FROM (VALUES
    ('unknown_d06', v_first, v_second, '22023', 'Unknown duplicate entity'),
    ('d06_forbidden', v_first, v_second, '42501', 'Duplicate entity module access denied'),
    ('pacientes', v_first, v_first, '22023', 'Duplicate candidate IDs must differ'),
    ('pacientes', v_first, v_missing, '22023', 'Both duplicate candidate rows must exist'),
    ('pacientes', v_missing, v_second, '22023', 'Both duplicate candidate rows must exist'),
    (NULL, v_first, v_second, '22004', 'Duplicate undo inputs must not be null'),
    ('pacientes', NULL, v_second, '22004', 'Duplicate undo inputs must not be null'),
    ('pacientes', v_first, NULL, '22004', 'Duplicate undo inputs must not be null')
  ) AS cases(entity, first_id, second_id, state, message) LOOP
    PERFORM pg_temp.assert_rejected(format('SELECT public.deshacer_descarte_duplicado(%L,%L,%L)',
      v_case.entity, v_case.first_id, v_case.second_id), v_case.state, v_case.message);
  END LOOP;
END $$;

RESET ROLE;
-- Owner-seeded discard gives undo a pair whose advisory lock no RPC has acquired yet.
INSERT INTO public.duplicados_descartes (entidad, item_id_a, item_id_b, motivo) VALUES
  ('pacientes', 'd0600000-0000-0000-0000-000000000002',
   'd0600000-0000-0000-0000-000000000003', 'no_son_la_misma');
CREATE TEMP TABLE d06_before AS
  SELECT 'pending' AS kind, to_jsonb(p) AS data FROM public.duplicados_pendientes p
  UNION ALL SELECT 'discard', to_jsonb(d) FROM public.duplicados_descartes d;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'd0600000-0000-0000-0000-000000000102', true);
DO $check$
BEGIN
  IF public.has_module('medical') IS TRUE THEN RAISE EXCEPTION 'Denied fixture has access'; END IF;
  PERFORM pg_temp.assert_rejected(
    $$SELECT public.decidir_descarte_duplicado('pacientes','d0600000-0000-0000-0000-000000000001',
      'd0600000-0000-0000-0000-000000000002','no_son_la_misma',NULL)$$,
    '42501', 'Duplicate entity module access denied');
  PERFORM pg_temp.assert_rejected(
    $$SELECT public.deshacer_descarte_duplicado('pacientes','d0600000-0000-0000-0000-000000000001',
      'd0600000-0000-0000-0000-000000000003')$$,
    '42501', 'Duplicate entity module access denied');
END $check$;

SET LOCAL ROLE anon;
DO $check$
BEGIN
  PERFORM pg_temp.assert_rejected(
    $$SELECT public.decidir_descarte_duplicado('pacientes','d0600000-0000-0000-0000-000000000001',
      'd0600000-0000-0000-0000-000000000002','no_son_la_misma',NULL)$$,
    '42501', 'permission denied for function decidir_descarte_duplicado');
  PERFORM pg_temp.assert_rejected(
    $$SELECT public.deshacer_descarte_duplicado('pacientes','d0600000-0000-0000-0000-000000000001',
      'd0600000-0000-0000-0000-000000000003')$$,
    '42501', 'permission denied for function deshacer_descarte_duplicado');
END $check$;
RESET ROLE;
DO $$
DECLARE
  v_function regprocedure;
BEGIN
  IF has_function_privilege('anon', 'public.lock_duplicate_discard_pair(text,uuid,uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.lock_duplicate_discard_pair(text,uuid,uuid)', 'EXECUTE')
     OR EXISTS (SELECT 1 FROM pg_proc, LATERAL aclexplode(proacl) acl
       WHERE oid = 'public.lock_duplicate_discard_pair(text,uuid,uuid)'::regprocedure
         AND acl.grantee = 0 AND acl.privilege_type = 'EXECUTE')
     OR NOT EXISTS (SELECT 1 FROM pg_proc
       WHERE oid = 'public.lock_duplicate_discard_pair(text,uuid,uuid)'::regprocedure
         AND prosecdef AND proconfig @> ARRAY['search_path=pg_catalog, pg_temp']) THEN
    RAISE EXCEPTION 'Unsafe internal pair-lock helper privileges or search_path';
  END IF;
  IF EXISTS (
    WITH after_state AS (
      SELECT 'pending' AS kind, to_jsonb(p) AS data FROM public.duplicados_pendientes p
      UNION ALL SELECT 'discard', to_jsonb(d) FROM public.duplicados_descartes d
    )
    (SELECT * FROM d06_before EXCEPT SELECT * FROM after_state)
    UNION ALL (SELECT * FROM after_state EXCEPT SELECT * FROM d06_before)
  ) THEN RAISE EXCEPTION 'Denied callers mutated pair state'; END IF;
  FOREACH v_function IN ARRAY ARRAY[
    'public.decidir_descarte_duplicado(text,uuid,uuid,text,text)'::regprocedure,
    'public.deshacer_descarte_duplicado(text,uuid,uuid)'::regprocedure
  ] LOOP
    IF has_function_privilege('anon', v_function, 'EXECUTE')
       OR NOT has_function_privilege('authenticated', v_function, 'EXECUTE')
       OR EXISTS (SELECT 1 FROM pg_proc, LATERAL aclexplode(proacl) acl
         WHERE oid = v_function AND acl.grantee = 0 AND acl.privilege_type = 'EXECUTE')
       OR NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid = v_function AND prosecdef
         AND proconfig @> ARRAY['search_path=pg_catalog, pg_temp']) THEN
      RAISE EXCEPTION 'Unsafe RPC privileges or search_path: %', v_function;
    END IF;
  END LOOP;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'd0600000-0000-0000-0000-000000000101', true);
SELECT public.deshacer_descarte_duplicado('pacientes',
  'd0600000-0000-0000-0000-000000000003', 'd0600000-0000-0000-0000-000000000002');
SELECT pg_temp.assert_pair_lock('pacientes',
  'd0600000-0000-0000-0000-000000000002', 'd0600000-0000-0000-0000-000000000003');
ROLLBACK;
\echo 'PASS: duplicate discard/undo checks (fixtures rolled back)'
