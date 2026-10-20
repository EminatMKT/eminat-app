\set ON_ERROR_STOP on
BEGIN;

-- Fail before fixtures when the migration has not been applied.
SELECT 'public.registrar_candidato_duplicado(text,uuid,uuid,text,text)'::regprocedure;

INSERT INTO public.roles (key, label) VALUES
  ('dedup_check_allowed', 'Dedup check allowed'),
  ('dedup_check_denied', 'Dedup check denied');
INSERT INTO public.role_modules (role_key, module_slug)
VALUES ('dedup_check_allowed', 'medical');
INSERT INTO auth.users (id, email) VALUES
  ('d0500000-0000-0000-0000-000000000001', 'dedup-allowed@example.invalid'),
  ('d0500000-0000-0000-0000-000000000002', 'dedup-denied@example.invalid');
INSERT INTO public.usuarios (id, auth_id, email, nombre, apellido, rol) VALUES
  ('d0500000-0000-0000-0000-000000000001', 'd0500000-0000-0000-0000-000000000001',
   'dedup-allowed@example.invalid', 'Dedup', 'Allowed', 'dedup_check_allowed'),
  ('d0500000-0000-0000-0000-000000000002', 'd0500000-0000-0000-0000-000000000002',
   'dedup-denied@example.invalid', 'Dedup', 'Denied', 'dedup_check_denied');
-- Explicit MRNs avoid advancing the nontransactional patient sequence.
INSERT INTO public.pacientes (id, mrn, nombre, apellido) VALUES
  ('d0500000-0000-0000-0000-000000000001', 'DEDUP-CHECK-1', 'Dedup', 'One'),
  ('d0500000-0000-0000-0000-000000000002', 'DEDUP-CHECK-2', 'Dedup', 'Two'),
  ('d0500000-0000-0000-0000-000000000003', 'DEDUP-CHECK-3', 'Dedup', 'Three');
INSERT INTO public.duplicados_entidades (entidad, tabla, modulo, funcion_candidatos) VALUES
  ('dedup_check_users', 'usuarios', 'medical', 'unused_check'),
  ('dedup_check_forbidden', 'missing_domain_table', 'dedup_check_missing_module', 'unused_check');
INSERT INTO public.duplicados_descartes (entidad, item_id_a, item_id_b, motivo) VALUES
  ('pacientes', 'd0500000-0000-0000-0000-000000000001',
   'd0500000-0000-0000-0000-000000000003', 'no_son_la_misma');

CREATE FUNCTION pg_temp.assert_registration_rejected(
  p_entity text, p_first uuid, p_second uuid, p_level text, p_origin text,
  p_state text, p_message text
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_state text;
  v_message text;
BEGIN
  BEGIN
    PERFORM public.registrar_candidato_duplicado(p_entity, p_first, p_second, p_level, p_origin);
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_message = MESSAGE_TEXT;
  END;
  -- Keep the assertion outside the handler: a successful call must fail the check.
  IF v_state IS DISTINCT FROM p_state OR v_message IS DISTINCT FROM p_message THEN
    RAISE EXCEPTION 'Expected % / %, got % / %', p_state, p_message, v_state, v_message;
  END IF;
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'd0500000-0000-0000-0000-000000000001', true);
DO $$
DECLARE
  v_first uuid := 'd0500000-0000-0000-0000-000000000001';
  v_second uuid := 'd0500000-0000-0000-0000-000000000002';
  v_before jsonb;
BEGIN
  IF public.is_admin() OR public.has_module('medical') IS NOT TRUE THEN
    RAISE EXCEPTION 'Fixture must use a non-admin with real medical access';
  END IF;
  PERFORM public.registrar_candidato_duplicado('pacientes', v_second, v_first, 'exacta', 'import');
  SELECT to_jsonb(v_row) INTO v_before FROM public.duplicados_pendientes v_row
    WHERE entidad = 'pacientes' AND item_id_a = v_first AND item_id_b = v_second;
  IF v_before IS NULL OR v_before->>'nivel' <> 'exacta' OR v_before->>'origen' <> 'import' THEN
    RAISE EXCEPTION 'Normalized insertion failed';
  END IF;
END $$;

RESET ROLE;
-- now() is transaction-stable: age the fixture so a timestamp-only update is observable.
UPDATE public.duplicados_pendientes SET detectado_at = now() - interval '1 day'
  WHERE entidad = 'pacientes'
    AND item_id_a = 'd0500000-0000-0000-0000-000000000001'
    AND item_id_b = 'd0500000-0000-0000-0000-000000000002';
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_first uuid := 'd0500000-0000-0000-0000-000000000001';
  v_second uuid := 'd0500000-0000-0000-0000-000000000002';
  v_third uuid := 'd0500000-0000-0000-0000-000000000003';
  v_missing uuid := 'd0500000-0000-0000-0000-000000000099';
  v_before jsonb;
  v_entity text;
  v_key bigint;
BEGIN
  SELECT to_jsonb(v_row) INTO v_before FROM public.duplicados_pendientes v_row
    WHERE entidad = 'pacientes' AND item_id_a = v_first AND item_id_b = v_second;
  IF (v_before->>'detectado_at')::timestamptz IS DISTINCT FROM now() - interval '1 day' THEN
    RAISE EXCEPTION 'Re-detection fixture must have an older detection timestamp';
  END IF;
  PERFORM public.registrar_candidato_duplicado('pacientes', v_first, v_second, 'parcial', 'escaneo');
  IF (SELECT count(*) FROM public.duplicados_pendientes
      WHERE entidad = 'pacientes' AND item_id_a = v_first) <> 1
     OR v_before IS DISTINCT FROM (SELECT to_jsonb(v_row) FROM public.duplicados_pendientes v_row
       WHERE entidad = 'pacientes' AND item_id_a = v_first AND item_id_b = v_second) THEN
    RAISE EXCEPTION 'Re-detection must not duplicate or update the original row';
  END IF;

  PERFORM public.registrar_candidato_duplicado('dedup_check_users', v_second, v_first, 'parcial', 'alta_manual');
  IF NOT EXISTS (SELECT 1 FROM public.duplicados_pendientes
      WHERE entidad = 'dedup_check_users' AND item_id_a = v_first AND item_id_b = v_second) THEN
    RAISE EXCEPTION 'Second entity with colliding domain UUIDs was not registered';
  END IF;
  -- Observe locks actually acquired by the RPC, not locks acquired by the check.
  FOREACH v_entity IN ARRAY ARRAY['pacientes', 'dedup_check_users'] LOOP
    v_key := hashtext(v_entity || '|' || v_first::text || '|' || v_second::text)::bigint;
    IF NOT EXISTS (SELECT 1 FROM pg_locks WHERE locktype = 'advisory'
        AND pid = pg_backend_pid() AND granted AND mode = 'ExclusiveLock'
        AND classid::bigint = ((v_key >> 32) & 4294967295)
        AND objid::bigint = (v_key & 4294967295) AND objsubid = 1) THEN
      RAISE EXCEPTION 'Missing entity-qualified advisory lock for %', v_entity;
    END IF;
  END LOOP;
  IF hashtext('pacientes|' || v_first::text || '|' || v_second::text)
      = hashtext('dedup_check_users|' || v_first::text || '|' || v_second::text) THEN
    RAISE EXCEPTION 'Lock fixtures unexpectedly collide';
  END IF;

  PERFORM pg_temp.assert_registration_rejected('pacientes', v_first, v_first, 'exacta', 'import', '22023', 'Duplicate candidate IDs must differ');
  PERFORM pg_temp.assert_registration_rejected('pacientes', v_third, v_first, 'exacta', 'import', '22023', 'Duplicate candidate pair was already discarded');
  PERFORM pg_temp.assert_registration_rejected('pacientes', v_first, v_missing, 'exacta', 'import', '22023', 'Both duplicate candidate rows must exist');
  PERFORM pg_temp.assert_registration_rejected('pacientes', v_missing, v_second, 'exacta', 'import', '22023', 'Both duplicate candidate rows must exist');
  PERFORM pg_temp.assert_registration_rejected('unknown_check_entity', v_first, v_second, 'exacta', 'import', '22023', 'Unknown duplicate entity');
  PERFORM pg_temp.assert_registration_rejected('dedup_check_forbidden', v_first, v_second, 'exacta', 'import', '42501', 'Duplicate entity module access denied');
  PERFORM pg_temp.assert_registration_rejected('pacientes', NULL, v_second, 'exacta', 'import', '22004', 'Duplicate candidate inputs must not be null');
  PERFORM pg_temp.assert_registration_rejected('pacientes', v_first, NULL, 'exacta', 'import', '22004', 'Duplicate candidate inputs must not be null');
  PERFORM pg_temp.assert_registration_rejected(NULL, v_first, v_second, 'exacta', 'import', '22004', 'Duplicate candidate inputs must not be null');
  PERFORM pg_temp.assert_registration_rejected('pacientes', v_first, v_second, NULL, 'import', '22004', 'Duplicate candidate inputs must not be null');
  PERFORM pg_temp.assert_registration_rejected('pacientes', v_first, v_second, 'exacta', NULL, '22004', 'Duplicate candidate inputs must not be null');
END $$;

SELECT set_config('request.jwt.claim.sub', 'd0500000-0000-0000-0000-000000000002', true);
DO $$
BEGIN
  IF public.has_module('medical') IS TRUE THEN
    RAISE EXCEPTION 'Denied fixture unexpectedly has medical access';
  END IF;
  PERFORM pg_temp.assert_registration_rejected('pacientes',
    'd0500000-0000-0000-0000-000000000001', 'd0500000-0000-0000-0000-000000000002',
    'exacta', 'import', '42501', 'Duplicate entity module access denied');
END $$;
RESET ROLE;

DO $$
DECLARE
  v_function regprocedure := 'public.registrar_candidato_duplicado(text,uuid,uuid,text,text)';
BEGIN
  IF has_function_privilege('anon', v_function, 'EXECUTE')
     OR NOT has_function_privilege('authenticated', v_function, 'EXECUTE')
     OR EXISTS (SELECT 1 FROM pg_proc, LATERAL aclexplode(proacl) v_acl
       WHERE oid = v_function AND v_acl.grantee = 0 AND v_acl.privilege_type = 'EXECUTE') THEN
    RAISE EXCEPTION 'RPC execute grants are unsafe';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid = v_function AND prosecdef
      AND proconfig @> ARRAY['search_path=pg_catalog, pg_temp']) THEN
    RAISE EXCEPTION 'RPC must be SECURITY DEFINER with a hardened search_path';
  END IF;
  IF (SELECT count(*) FROM public.duplicados_pendientes
      WHERE item_id_a = 'd0500000-0000-0000-0000-000000000001') <> 2 THEN
    RAISE EXCEPTION 'Rejected calls left unexpected pending rows';
  END IF;
END $$;
ROLLBACK;
\echo 'PASS: duplicate registration checks (fixtures rolled back)'
