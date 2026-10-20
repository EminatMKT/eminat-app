\set ON_ERROR_STOP on
BEGIN;

SELECT 'public.revertir_fusion_duplicado(uuid)'::regprocedure;

INSERT INTO public.roles (key, label) VALUES
  ('dedup_revert_allowed', 'Dedup revert allowed'),
  ('dedup_revert_denied', 'Dedup revert denied');
INSERT INTO public.role_modules (role_key, module_slug) VALUES ('dedup_revert_allowed', 'medical');
INSERT INTO auth.users (id, email) VALUES
  ('d1000000-0000-0000-0000-000000000011', 'dedup-revert@example.invalid'),
  ('d1000000-0000-0000-0000-000000000012', 'dedup-revert-denied@example.invalid');
INSERT INTO public.usuarios (id, auth_id, email, nombre, apellido, rol) VALUES
  ('d1000000-0000-0000-0000-000000000021', 'd1000000-0000-0000-0000-000000000011',
   'dedup-revert@example.invalid', 'Dedup', 'Revert', 'dedup_revert_allowed'),
  ('d1000000-0000-0000-0000-000000000022', 'd1000000-0000-0000-0000-000000000012',
   'dedup-revert-denied@example.invalid', 'Dedup', 'Denied', 'dedup_revert_denied');

INSERT INTO public.pacientes (id, mrn, nombre, apellido, telefono) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'REVERT-A', 'Rev', 'A', '555-1001'),
  ('d1000000-0000-0000-0000-000000000002', 'REVERT-B', 'Rev', 'B', '555-1002'),
  ('d1000000-0000-0000-0000-000000000003', 'REVERT-C', 'Rev', 'C', '555-1003');
INSERT INTO public.paciente_fuentes (paciente_id, fuente, clave_origen) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'manual', 'revert-a'),
  ('d1000000-0000-0000-0000-000000000002', 'manual', 'revert-b'),
  ('d1000000-0000-0000-0000-000000000003', 'manual', 'revert-c');
INSERT INTO public.paciente_contactos (id, paciente_id, tipo, valor) VALUES
  ('d1000000-0000-0000-0000-000000000030', 'd1000000-0000-0000-0000-000000000001', 'telefono', '555-1030'),
  ('d1000000-0000-0000-0000-000000000031', 'd1000000-0000-0000-0000-000000000002', 'telefono', '555-1031'),
  ('d1000000-0000-0000-0000-000000000032', 'd1000000-0000-0000-0000-000000000003', 'telefono', '555-1032');
INSERT INTO public.duplicados_pendientes (entidad, item_id_a, item_id_b, nivel, origen) VALUES
  ('pacientes', 'd1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000002', 'exacta', 'alta_manual'),
  ('pacientes', 'd1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000003', 'exacta', 'alta_manual');

CREATE FUNCTION pg_temp.assert_revert_rejected(p_fusion_id uuid, p_state text, p_message text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_state text; v_message text;
BEGIN
  BEGIN
    PERFORM public.revertir_fusion_duplicado(p_fusion_id);
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_message = MESSAGE_TEXT;
  END;
  IF v_state IS DISTINCT FROM p_state OR v_message IS DISTINCT FROM p_message THEN
    RAISE EXCEPTION 'Expected % / %, got % / %', p_state, p_message, v_state, v_message;
  END IF;
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000011', true);
SELECT public.fusionar_duplicado(
  'pacientes',
  'd1000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000002',
  '{"apellido":"A","telefono":"555-1002"}'
);

-- The production RPC is called in separate transactions. Make that ordering explicit
-- here so the check does not depend on `now()` being transaction-scoped.
RESET ROLE;
UPDATE public.duplicados_fusiones
SET decidido_at = decidido_at - interval '1 microsecond'
WHERE ganador_id = 'd1000000-0000-0000-0000-000000000001'
  AND perdedor_id = 'd1000000-0000-0000-0000-000000000002';
SET LOCAL ROLE authenticated;
SELECT public.fusionar_duplicado(
  'pacientes',
  'd1000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000003',
  '{"apellido":"A","telefono":"555-1003"}'
);
SELECT id AS fusion2_id FROM public.duplicados_fusiones
  WHERE ganador_id = 'd1000000-0000-0000-0000-000000000001'
    AND perdedor_id = 'd1000000-0000-0000-0000-000000000003'
\gset
SELECT set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000012', true);
SELECT pg_temp.assert_revert_rejected(
  :'fusion2_id'::uuid,
  '42501',
  'Duplicate entity module access denied'
);
SELECT set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000011', true);

DO $$
DECLARE
  v_a uuid := 'd1000000-0000-0000-0000-000000000001';
  v_b uuid := 'd1000000-0000-0000-0000-000000000002';
  v_c uuid := 'd1000000-0000-0000-0000-000000000003';
  v_fusion_1 uuid;
  v_fusion_2 uuid;
BEGIN
  SELECT id INTO STRICT v_fusion_1 FROM public.duplicados_fusiones WHERE ganador_id = v_a AND perdedor_id = v_b;
  SELECT id INTO STRICT v_fusion_2 FROM public.duplicados_fusiones WHERE ganador_id = v_a AND perdedor_id = v_c;

  PERFORM pg_temp.assert_revert_rejected(v_fusion_1, 'P0001', 'cannot revert: this item merged again later');

  PERFORM public.revertir_fusion_duplicado(v_fusion_2);
  IF NOT EXISTS (SELECT 1 FROM public.pacientes WHERE id = v_c)
     OR (SELECT nombre FROM public.pacientes WHERE id = v_c) IS DISTINCT FROM 'Rev'
     OR (SELECT apellido FROM public.pacientes WHERE id = v_c) IS DISTINCT FROM 'C'
     OR (SELECT mrn FROM public.pacientes WHERE id = v_c) IS DISTINCT FROM 'REVERT-C'
     OR (SELECT telefono FROM public.pacientes WHERE id = v_a) IS DISTINCT FROM '555-1002'
     OR NOT EXISTS (SELECT 1 FROM public.paciente_fuentes WHERE paciente_id = v_c AND clave_origen = 'revert-c')
     OR NOT EXISTS (SELECT 1 FROM public.paciente_contactos WHERE id = 'd1000000-0000-0000-0000-000000000032' AND paciente_id = v_c) THEN
    RAISE EXCEPTION 'Revert must recreate the loser from its snapshot and restore only its moved children';
  END IF;

  PERFORM public.revertir_fusion_duplicado(v_fusion_1);
  IF NOT EXISTS (SELECT 1 FROM public.pacientes WHERE id = v_b)
     OR (SELECT apellido FROM public.pacientes WHERE id = v_b) IS DISTINCT FROM 'B'
     OR (SELECT mrn FROM public.pacientes WHERE id = v_b) IS DISTINCT FROM 'REVERT-B'
     OR (SELECT apellido FROM public.pacientes WHERE id = v_a) IS DISTINCT FROM 'A'
     OR (SELECT telefono FROM public.pacientes WHERE id = v_a) IS DISTINCT FROM '555-1001'
     OR NOT EXISTS (SELECT 1 FROM public.paciente_fuentes WHERE paciente_id = v_b AND clave_origen = 'revert-b')
     OR NOT EXISTS (SELECT 1 FROM public.paciente_contactos WHERE id = 'd1000000-0000-0000-0000-000000000031' AND paciente_id = v_b)
     OR NOT EXISTS (SELECT 1 FROM public.paciente_fuentes WHERE paciente_id = v_a AND clave_origen = 'revert-a')
     OR NOT EXISTS (SELECT 1 FROM public.paciente_contactos WHERE id = 'd1000000-0000-0000-0000-000000000030' AND paciente_id = v_a) THEN
    RAISE EXCEPTION 'Revert must restore the winner and exact first-merge children';
  END IF;
  IF (SELECT revertido_por FROM public.duplicados_fusiones WHERE id = v_fusion_1)
       IS DISTINCT FROM 'd1000000-0000-0000-0000-000000000021'::uuid THEN
    RAISE EXCEPTION 'Revert audit actor must be the application user';
  END IF;
  PERFORM pg_temp.assert_revert_rejected(v_fusion_1, 'P0001', 'this merge was already reverted');
END $$;

-- A merge that skipped two loser contacts — …041 collides with the winner's …040, …042 was
-- unchecked — must give both back on revert, whole, next to the one that moved (…043).
RESET ROLE;
INSERT INTO public.pacientes (id, mrn, nombre, apellido) VALUES
  ('d1000000-0000-0000-0000-000000000004', 'REVERT-D', 'Rev', 'D'),
  ('d1000000-0000-0000-0000-000000000005', 'REVERT-E', 'Rev', 'D');
INSERT INTO public.paciente_contactos (id, paciente_id, tipo, valor) VALUES
  ('d1000000-0000-0000-0000-000000000040', 'd1000000-0000-0000-0000-000000000004', 'telefono', '555-1040'),
  ('d1000000-0000-0000-0000-000000000041', 'd1000000-0000-0000-0000-000000000005', 'telefono', '555-1040'),
  ('d1000000-0000-0000-0000-000000000042', 'd1000000-0000-0000-0000-000000000005', 'telefono', '555-1042'),
  ('d1000000-0000-0000-0000-000000000043', 'd1000000-0000-0000-0000-000000000005', 'telefono', '555-1043');
INSERT INTO public.duplicados_pendientes (entidad, item_id_a, item_id_b, nivel, origen) VALUES
  ('pacientes', 'd1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000005', 'exacta', 'alta_manual');
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  v_d uuid := 'd1000000-0000-0000-0000-000000000004';
  v_e uuid := 'd1000000-0000-0000-0000-000000000005';
  v_before jsonb;
  v_fusion uuid;
BEGIN
  SELECT jsonb_agg(to_jsonb(c) ORDER BY c.id) INTO v_before FROM public.paciente_contactos c WHERE paciente_id = v_e;
  PERFORM public.fusionar_duplicado('pacientes', v_d, v_e, '{}', ARRAY['d1000000-0000-0000-0000-000000000042']::uuid[]);
  SELECT id INTO STRICT v_fusion FROM public.duplicados_fusiones WHERE ganador_id = v_d AND perdedor_id = v_e;

  -- A current row holding a discarded row's key: the revert must refuse, not restore half.
  INSERT INTO public.paciente_contactos (id, paciente_id, tipo, valor)
    VALUES ('d1000000-0000-0000-0000-000000000042', v_d, 'telefono', '555-1099');
  PERFORM pg_temp.assert_revert_rejected(v_fusion, 'P0001', 'cannot revert: a discarded paciente_contactos row conflicts with a current one');
  IF EXISTS (SELECT 1 FROM public.pacientes WHERE id = v_e) THEN
    RAISE EXCEPTION 'A refused revert must leave the loser deleted';
  END IF;
  DELETE FROM public.paciente_contactos WHERE id = 'd1000000-0000-0000-0000-000000000042';

  PERFORM public.revertir_fusion_duplicado(v_fusion);
  IF (SELECT jsonb_agg(to_jsonb(c) ORDER BY c.id) FROM public.paciente_contactos c WHERE paciente_id = v_e) IS DISTINCT FROM v_before
     OR (SELECT array_agg(id) FROM public.paciente_contactos WHERE paciente_id = v_d)
        IS DISTINCT FROM ARRAY['d1000000-0000-0000-0000-000000000040']::uuid[] THEN
    RAISE EXCEPTION 'Revert must re-create every skipped contact whole and move the moved one back';
  END IF;
END $$;

RESET ROLE;
DO $$
DECLARE v_function regprocedure := 'public.revertir_fusion_duplicado(uuid)';
BEGIN
  IF has_function_privilege('anon', v_function, 'EXECUTE')
     OR NOT has_function_privilege('authenticated', v_function, 'EXECUTE')
     OR EXISTS (SELECT 1 FROM pg_proc, LATERAL aclexplode(proacl) a WHERE oid = v_function AND a.grantee = 0 AND a.privilege_type = 'EXECUTE')
     OR NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid = v_function AND prosecdef AND proconfig @> ARRAY['search_path=pg_catalog, pg_temp']) THEN
    RAISE EXCEPTION 'Revert RPC grants or search path are unsafe';
  END IF;
END $$;
ROLLBACK;
\echo 'PASS: duplicate merge revert checks (fixtures rolled back)'
