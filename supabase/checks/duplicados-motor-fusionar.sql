\set ON_ERROR_STOP on
BEGIN;
SELECT 'public.fusionar_duplicado(text,uuid,uuid,jsonb,uuid[])'::regprocedure;
DO $$ BEGIN
  IF to_regprocedure('public.fusionar_duplicado(text,uuid,uuid,jsonb)') IS NOT NULL THEN
    RAISE EXCEPTION 'The 4-argument overload must be gone: next to the new one it makes every 4-argument call ambiguous';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
      AND table_name = 'duplicados_fusiones' AND column_name = 'hijos_descartados') THEN
    RAISE EXCEPTION 'duplicados_fusiones must keep the skipped child rows';
  END IF;
END $$;
\if :{?adapter_payload}
\else
\set adapter_payload '{"nombre":"Fixture","apellido":"Winner","telefono":"555-0102","estado":"activo","email":null}'
\endif
SELECT set_config('dedup_check.adapter_payload', :'adapter_payload', true);

INSERT INTO public.roles (key, label) VALUES ('merge_allowed', 'Merge allowed'), ('merge_denied', 'Merge denied');
INSERT INTO public.role_modules (role_key, module_slug) VALUES ('merge_allowed', 'medical');
INSERT INTO auth.users (id, email) VALUES
  ('d0900000-0000-0000-0000-000000000011', 'merge-allowed@example.invalid'),
  ('d0900000-0000-0000-0000-000000000012', 'merge-denied@example.invalid');
INSERT INTO public.usuarios (id, auth_id, email, nombre, apellido, rol) VALUES
  ('d0900000-0000-0000-0000-000000000021', 'd0900000-0000-0000-0000-000000000011', 'merge-allowed@example.invalid', 'Merge', 'Allowed', 'merge_allowed'),
  ('d0900000-0000-0000-0000-000000000022', 'd0900000-0000-0000-0000-000000000012', 'merge-denied@example.invalid', 'Merge', 'Denied', 'merge_denied');
-- Explicit MRNs keep the nontransactional sequence unchanged.
INSERT INTO public.pacientes (id, mrn, nombre, apellido, telefono) VALUES
  ('d0900000-0000-0000-0000-000000000001', 'MERGE-1', 'Fixture', 'Winner', NULL),
  ('d0900000-0000-0000-0000-000000000002', 'MERGE-2', 'Fixture', 'Loser', '555-0102'),
  ('d0900000-0000-0000-0000-000000000003', 'MERGE-3', 'Fixture', 'Third', NULL),
  ('d0900000-0000-0000-0000-000000000004', 'MERGE-4', 'Fixture', 'Same', NULL),
  ('d0900000-0000-0000-0000-000000000005', 'MERGE-5', 'Fixture', 'Same', NULL),
  ('d0900000-0000-0000-0000-000000000006', 'MERGE-6', 'Fixture', 'Collision', NULL),
  ('d0900000-0000-0000-0000-000000000007', 'MERGE-7', 'Fixture', 'Collision', '555-0107'),
  ('d0900000-0000-0000-0000-000000000008', 'MERGE-8', 'Fixture', 'Exclude', NULL),
  ('d0900000-0000-0000-0000-000000000009', 'MERGE-9', 'Fixture', 'Exclude', NULL);
INSERT INTO public.paciente_fuentes (paciente_id, fuente, clave_origen) VALUES
  ('d0900000-0000-0000-0000-000000000001', 'manual', 'merge-winner'),
  ('d0900000-0000-0000-0000-000000000002', 'manual', 'merge-loser'),
  ('d0900000-0000-0000-0000-000000000007', 'manual', 'merge-collision');
INSERT INTO public.paciente_contactos (id, paciente_id, tipo, valor) VALUES
  ('d0900000-0000-0000-0000-000000000031', 'd0900000-0000-0000-0000-000000000001', 'telefono', '555-0131'),
  ('d0900000-0000-0000-0000-000000000032', 'd0900000-0000-0000-0000-000000000002', 'telefono', '555-0132'),
  ('d0900000-0000-0000-0000-000000000036', 'd0900000-0000-0000-0000-000000000006', 'telefono', '555-0136'),
  ('d0900000-0000-0000-0000-000000000037', 'd0900000-0000-0000-0000-000000000007', 'telefono', '555-0136'),
  ('d0900000-0000-0000-0000-000000000041', 'd0900000-0000-0000-0000-000000000008', 'telefono', '555-0141'),
  ('d0900000-0000-0000-0000-000000000042', 'd0900000-0000-0000-0000-000000000009', 'telefono', '555-0142'),
  ('d0900000-0000-0000-0000-000000000043', 'd0900000-0000-0000-0000-000000000009', 'telefono', '555-0143'),
  ('d0900000-0000-0000-0000-000000000044', 'd0900000-0000-0000-0000-000000000009', 'email', 'solo@example.invalid'),
  ('d0900000-0000-0000-0000-000000000045', 'd0900000-0000-0000-0000-000000000009', 'telefono', '555-0141'),
  ('d0900000-0000-0000-0000-000000000046', 'd0900000-0000-0000-0000-000000000003', 'telefono', '555-0146');
INSERT INTO public.duplicados_entidades (entidad, tabla, modulo, funcion_candidatos) VALUES
  ('merge_other', 'pacientes', 'medical', 'unused_check');
INSERT INTO public.duplicados_pendientes (entidad, item_id_a, item_id_b, nivel, origen) VALUES
  ('pacientes', 'd0900000-0000-0000-0000-000000000001', 'd0900000-0000-0000-0000-000000000002', 'parcial', 'import'),
  ('pacientes', 'd0900000-0000-0000-0000-000000000002', 'd0900000-0000-0000-0000-000000000003', 'parcial', 'import'),
  ('pacientes', 'd0900000-0000-0000-0000-000000000004', 'd0900000-0000-0000-0000-000000000005', 'exacta', 'import'),
  ('pacientes', 'd0900000-0000-0000-0000-000000000006', 'd0900000-0000-0000-0000-000000000007', 'parcial', 'import'),
  ('pacientes', 'd0900000-0000-0000-0000-000000000008', 'd0900000-0000-0000-0000-000000000009', 'parcial', 'import'),
  ('merge_other', 'd0900000-0000-0000-0000-000000000002', 'd0900000-0000-0000-0000-000000000003', 'parcial', 'import');
INSERT INTO public.duplicados_descartes (entidad, item_id_a, item_id_b, motivo) VALUES
  ('pacientes', 'd0900000-0000-0000-0000-000000000002', 'd0900000-0000-0000-0000-000000000004', 'no_son_la_misma'),
  ('merge_other', 'd0900000-0000-0000-0000-000000000002', 'd0900000-0000-0000-0000-000000000004', 'no_son_la_misma');

CREATE FUNCTION pg_temp.assert_merge_rejected(p_entity text, p_winner uuid, p_loser uuid, p_payload jsonb, p_state text, p_message text, p_excluded uuid[] DEFAULT '{}')
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_state text; v_message text;
BEGIN
  BEGIN
    PERFORM public.fusionar_duplicado(p_entity, p_winner, p_loser, p_payload, p_excluded);
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_message = MESSAGE_TEXT;
  END;
  IF v_state IS DISTINCT FROM p_state OR (p_message IS NOT NULL AND v_message IS DISTINCT FROM p_message) THEN
    RAISE EXCEPTION 'Expected % / %, got % / %', p_state, p_message, v_state, v_message;
  END IF;
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'd0900000-0000-0000-0000-000000000012', true);
SELECT pg_temp.assert_merge_rejected('pacientes', 'd0900000-0000-0000-0000-000000000001', 'd0900000-0000-0000-0000-000000000002', '{}', '42501', 'Duplicate entity module access denied');
SELECT set_config('request.jwt.claim.sub', 'd0900000-0000-0000-0000-000000000011', true);
DO $$
DECLARE
  v_winner uuid := 'd0900000-0000-0000-0000-000000000001';
  v_loser uuid := 'd0900000-0000-0000-0000-000000000002';
  v_payload jsonb;
  v_key text;
  v_before jsonb;
  v_loser_before jsonb;
  v_audit public.duplicados_fusiones;
BEGIN
  IF public.is_admin() OR public.has_module('medical') IS NOT TRUE THEN
    RAISE EXCEPTION 'Fixture requires a non-admin with module access';
  END IF;
  SELECT to_jsonb(p) INTO v_before FROM public.pacientes p WHERE id = v_winner;
  SELECT to_jsonb(p) INTO v_loser_before FROM public.pacientes p WHERE id = v_loser;
  PERFORM pg_temp.assert_merge_rejected(NULL, v_winner, v_loser, '{}', '22004', 'Duplicate merge inputs must not be null');
  PERFORM pg_temp.assert_merge_rejected('pacientes', NULL, v_loser, '{}', '22004', 'Duplicate merge inputs must not be null');
  PERFORM pg_temp.assert_merge_rejected('pacientes', v_winner, NULL, '{}', '22004', 'Duplicate merge inputs must not be null');
  PERFORM pg_temp.assert_merge_rejected('pacientes', v_winner, v_loser, NULL, '22004', 'Duplicate merge inputs must not be null');
  FOREACH v_payload IN ARRAY ARRAY['null'::jsonb, '[]'::jsonb, '1'::jsonb, '"x"'::jsonb] LOOP
    PERFORM pg_temp.assert_merge_rejected('pacientes', v_winner, v_loser, v_payload, '22023', 'Merge values must be a JSON object');
  END LOOP;
  PERFORM pg_temp.assert_merge_rejected('missing_entity', v_winner, v_loser, '{}', '22023', 'Unknown duplicate entity');
  PERFORM pg_temp.assert_merge_rejected('pacientes', v_winner, v_winner, '{}', '22023', 'Duplicate candidate IDs must differ');
  PERFORM pg_temp.assert_merge_rejected('pacientes', v_winner, 'd0900000-0000-0000-0000-000000000099', '{}', '22023', 'Both duplicate candidate rows must exist');
  PERFORM pg_temp.assert_merge_rejected('pacientes', 'd0900000-0000-0000-0000-000000000099', v_loser, '{}', '22023', 'Both duplicate candidate rows must exist');
  PERFORM pg_temp.assert_merge_rejected('pacientes', v_winner, 'd0900000-0000-0000-0000-000000000003', '{}', '22023', 'Duplicate pair is not pending');
  FOREACH v_key IN ARRAY ARRAY['id', 'mrn', 'created_at', 'updated_at'] LOOP
    PERFORM pg_temp.assert_merge_rejected('pacientes', v_winner, v_loser, jsonb_build_object(v_key, v_before->v_key), '22023', 'Merge values contain an excluded column');
  END LOOP;
  PERFORM pg_temp.assert_merge_rejected('pacientes', v_winner, v_loser, '{"bogus":null}', '22023', 'Merge values contain an unknown column');
  PERFORM pg_temp.assert_merge_rejected('pacientes', v_winner, v_loser, '{"telefono":7}', '22023', 'Merge value does not match either current snapshot');
  PERFORM pg_temp.assert_merge_rejected('pacientes', v_winner, v_loser, '{"apellido":null}', '22023', 'Merge value does not match either current snapshot');
  PERFORM pg_temp.assert_merge_rejected('pacientes', v_winner, v_loser, '{}', '22023', 'Merge values omit a differing column');
  PERFORM pg_temp.assert_merge_rejected('pacientes', v_winner, v_loser, '{"apellido":"Winner"}', '22023', 'Merge values omit a differing column');
  PERFORM pg_temp.assert_merge_rejected('pacientes', v_winner, v_loser, '{"telefono":"555-0102"}', '22023', 'Merge values omit a differing column');
  IF v_before IS DISTINCT FROM (SELECT to_jsonb(p) FROM public.pacientes p WHERE id = v_winner)
     OR v_loser_before IS DISTINCT FROM (SELECT to_jsonb(p) FROM public.pacientes p WHERE id = v_loser)
     OR EXISTS (SELECT 1 FROM public.duplicados_fusiones WHERE ganador_id = v_winner) THEN
    RAISE EXCEPTION 'Rejected payloads modified domain or audit';
  END IF;
  -- The default also selects shared NULL; callers can supply actual adapter output unchanged.
  v_payload := current_setting('dedup_check.adapter_payload')::jsonb;
  PERFORM public.fusionar_duplicado('pacientes', v_winner, v_loser, v_payload);
  PERFORM pg_temp.assert_merge_rejected('pacientes', v_winner, v_loser, v_payload, '22023', 'Both duplicate candidate rows must exist');
  SELECT * INTO STRICT v_audit FROM public.duplicados_fusiones WHERE ganador_id = v_winner;
  IF v_audit.ganador_snapshot_previo IS DISTINCT FROM v_before OR v_audit.perdedor_snapshot IS DISTINCT FROM v_loser_before
     OR v_audit.decidido_por IS DISTINCT FROM 'd0900000-0000-0000-0000-000000000021'::uuid
     OR v_audit.perdedor_id IS DISTINCT FROM v_loser OR v_audit.entidad <> 'pacientes' THEN
    RAISE EXCEPTION 'Audit must preserve snapshots, domain IDs and application actor';
  END IF;
  IF v_audit.hijos_movidos IS DISTINCT FROM '[{"tabla":"paciente_fuentes","columna":"paciente_id","claves":[{"fuente":"manual","clave_origen":"merge-loser"}]},{"tabla":"paciente_contactos","columna":"paciente_id","claves":[{"id":"d0900000-0000-0000-0000-000000000032"}]}]'::jsonb THEN
    RAISE EXCEPTION 'Audit must identify exactly moved primary keys, including composite keys: %', v_audit.hijos_movidos;
  END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(v_audit.hijos_descartados) t, jsonb_array_elements(t->'filas')) <> 0 THEN
    RAISE EXCEPTION 'A merge that skipped nothing must record no discarded rows: %', v_audit.hijos_descartados;
  END IF;
  IF EXISTS (SELECT 1 FROM public.pacientes WHERE id = v_loser)
     OR (SELECT telefono FROM public.pacientes WHERE id = v_winner) IS DISTINCT FROM '555-0102'
     OR (SELECT count(*) FROM public.paciente_fuentes WHERE paciente_id = v_winner) <> 2
     OR (SELECT count(*) FROM public.paciente_contactos WHERE paciente_id = v_winner) <> 2 THEN
    RAISE EXCEPTION 'Merge did not preserve winner, delete loser and reassign children';
  END IF;
  IF EXISTS (SELECT 1 FROM public.duplicados_pendientes WHERE entidad = 'pacientes' AND v_loser IN (item_id_a, item_id_b))
     OR EXISTS (SELECT 1 FROM public.duplicados_descartes WHERE entidad = 'pacientes' AND v_loser IN (item_id_a, item_id_b))
     OR NOT EXISTS (SELECT 1 FROM public.duplicados_pendientes WHERE entidad = 'merge_other' AND item_id_a = v_loser)
     OR NOT EXISTS (SELECT 1 FROM public.duplicados_descartes WHERE entidad = 'merge_other' AND item_id_a = v_loser) THEN
    RAISE EXCEPTION 'Pair cleanup must include third parties but remain entity-scoped';
  END IF;
  -- Reverse winner order and no differing allowed values: the UPDATE must be skipped.
  PERFORM public.fusionar_duplicado('pacientes', 'd0900000-0000-0000-0000-000000000005', 'd0900000-0000-0000-0000-000000000004', '{}');
  IF EXISTS (SELECT 1 FROM public.pacientes WHERE id = 'd0900000-0000-0000-0000-000000000004') THEN
    RAISE EXCEPTION 'Empty payload merge did not delete loser';
  END IF;
END $$;

-- Both share contact 555-0136 from the same source, the most common real duplicate. The
-- colliding loser row (…037) sorts before a non-colliding one (…038), so a skip must not
-- swallow the rows after it.
RESET ROLE;
INSERT INTO public.paciente_contactos (id, paciente_id, tipo, valor) VALUES
  ('d0900000-0000-0000-0000-000000000038', 'd0900000-0000-0000-0000-000000000007', 'telefono', '555-0138');
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  v_winner uuid := 'd0900000-0000-0000-0000-000000000006';
  v_loser uuid := 'd0900000-0000-0000-0000-000000000007';
  v_audit public.duplicados_fusiones;
BEGIN
  PERFORM public.fusionar_duplicado('pacientes', v_winner, v_loser, '{"telefono":"555-0107"}');
  IF EXISTS (SELECT 1 FROM public.pacientes WHERE id = v_loser)
     OR EXISTS (SELECT 1 FROM public.paciente_contactos WHERE id = 'd0900000-0000-0000-0000-000000000037')
     OR (SELECT array_agg(id ORDER BY id) FROM public.paciente_contactos WHERE paciente_id = v_winner)
        IS DISTINCT FROM ARRAY['d0900000-0000-0000-0000-000000000036', 'd0900000-0000-0000-0000-000000000038']::uuid[]
     OR NOT EXISTS (SELECT 1 FROM public.paciente_fuentes WHERE clave_origen = 'merge-collision' AND paciente_id = v_winner) THEN
    RAISE EXCEPTION 'A child row colliding with the winner must be skipped, not abort the merge';
  END IF;
  SELECT * INTO STRICT v_audit FROM public.duplicados_fusiones WHERE ganador_id = v_winner;
  IF v_audit.hijos_movidos IS DISTINCT FROM '[{"tabla":"paciente_fuentes","columna":"paciente_id","claves":[{"fuente":"manual","clave_origen":"merge-collision"}]},{"tabla":"paciente_contactos","columna":"paciente_id","claves":[{"id":"d0900000-0000-0000-0000-000000000038"}]}]'::jsonb THEN
    RAISE EXCEPTION 'Audit must list only the child rows actually moved: %', v_audit.hijos_movidos;
  END IF;
  IF (SELECT jsonb_agg(f->>'id') FROM jsonb_array_elements(v_audit.hijos_descartados) t, jsonb_array_elements(t->'filas') f)
       IS DISTINCT FROM '["d0900000-0000-0000-0000-000000000037"]'::jsonb
     OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_audit.hijos_descartados) t, jsonb_array_elements(t->'filas') f
       WHERE t->>'tabla' = 'paciente_contactos' AND f->>'paciente_id' = v_loser::text AND f->>'valor' = '555-0136') THEN
    RAISE EXCEPTION 'A collision-skipped row must be kept whole in the audit: %', v_audit.hijos_descartados;
  END IF;
END $$;

-- Loser …009: the reviewer drops …042, …045 (which would collide with the winner's …041 anyway)
-- and its only email …044, and keeps …043. The list repeats …042 on purpose: duplicates are fine.
DO $$
DECLARE
  v_winner uuid := 'd0900000-0000-0000-0000-000000000008';
  v_loser uuid := 'd0900000-0000-0000-0000-000000000009';
  v_drop uuid[] := ARRAY['d0900000-0000-0000-0000-000000000042', 'd0900000-0000-0000-0000-000000000044',
    'd0900000-0000-0000-0000-000000000045', 'd0900000-0000-0000-0000-000000000042']::uuid[];
  v_audit public.duplicados_fusiones;
BEGIN
  PERFORM pg_temp.assert_merge_rejected('pacientes', v_winner, v_loser, '{}', '22004', 'Duplicate merge inputs must not be null', NULL);
  -- The winner's own contact, a third patient's contact, and a NULL entry: all foreign.
  PERFORM pg_temp.assert_merge_rejected('pacientes', v_winner, v_loser, '{}', '22023', 'Excluded child rows must belong to the loser',
    ARRAY['d0900000-0000-0000-0000-000000000041']::uuid[]);
  PERFORM pg_temp.assert_merge_rejected('pacientes', v_winner, v_loser, '{}', '22023', 'Excluded child rows must belong to the loser',
    ARRAY['d0900000-0000-0000-0000-000000000042', 'd0900000-0000-0000-0000-000000000046']::uuid[]);
  PERFORM pg_temp.assert_merge_rejected('pacientes', v_winner, v_loser, '{}', '22023', 'Excluded child rows must belong to the loser',
    ARRAY[NULL]::uuid[]);
  IF NOT EXISTS (SELECT 1 FROM public.pacientes WHERE id = v_loser)
     OR (SELECT count(*) FROM public.paciente_contactos WHERE paciente_id = v_loser) <> 4 THEN
    RAISE EXCEPTION 'A rejected exclusion list must leave the loser and its contacts untouched';
  END IF;

  PERFORM public.fusionar_duplicado('pacientes', v_winner, v_loser, '{}', v_drop);
  IF EXISTS (SELECT 1 FROM public.paciente_contactos WHERE id = ANY(v_drop))
     OR (SELECT array_agg(id ORDER BY id) FROM public.paciente_contactos WHERE paciente_id = v_winner)
        IS DISTINCT FROM ARRAY['d0900000-0000-0000-0000-000000000041', 'd0900000-0000-0000-0000-000000000043']::uuid[]
     OR NOT EXISTS (SELECT 1 FROM public.paciente_contactos WHERE id = 'd0900000-0000-0000-0000-000000000046') THEN
    RAISE EXCEPTION 'Excluded loser contacts must be gone, and every other contact must survive';
  END IF;
  SELECT * INTO STRICT v_audit FROM public.duplicados_fusiones WHERE ganador_id = v_winner;
  IF v_audit.hijos_movidos IS DISTINCT FROM '[{"tabla":"paciente_fuentes","columna":"paciente_id","claves":[]},{"tabla":"paciente_contactos","columna":"paciente_id","claves":[{"id":"d0900000-0000-0000-0000-000000000043"}]}]'::jsonb THEN
    RAISE EXCEPTION 'Audit must list only the contacts that actually moved: %', v_audit.hijos_movidos;
  END IF;
  IF (SELECT jsonb_agg(f->>'id' ORDER BY f->>'id') FROM jsonb_array_elements(v_audit.hijos_descartados) t, jsonb_array_elements(t->'filas') f)
       IS DISTINCT FROM '["d0900000-0000-0000-0000-000000000042","d0900000-0000-0000-0000-000000000044","d0900000-0000-0000-0000-000000000045"]'::jsonb THEN
    RAISE EXCEPTION 'Every excluded row must be kept whole in the audit, once: %', v_audit.hijos_descartados;
  END IF;
END $$;
RESET ROLE;
DO $$
DECLARE v_function regprocedure := 'public.fusionar_duplicado(text,uuid,uuid,jsonb,uuid[])';
BEGIN
  IF has_function_privilege('anon', v_function, 'EXECUTE')
     OR NOT has_function_privilege('authenticated', v_function, 'EXECUTE')
     OR EXISTS (SELECT 1 FROM pg_proc, LATERAL aclexplode(proacl) a WHERE oid = v_function AND a.grantee = 0 AND a.privilege_type = 'EXECUTE')
     OR NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid = v_function AND prosecdef AND proconfig @> ARRAY['search_path=pg_catalog, pg_temp']) THEN
    RAISE EXCEPTION 'Merge RPC grants or search path are unsafe';
  END IF;
END $$;
ROLLBACK;
\echo 'PASS: duplicate merge checks (fixtures rolled back; concurrency requires two sessions)'
