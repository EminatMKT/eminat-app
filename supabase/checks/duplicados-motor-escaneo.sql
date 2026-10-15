\set ON_ERROR_STOP on
BEGIN;

SELECT 'public.escanear_duplicados(text)'::regprocedure;
SELECT 'public.pacientes_candidatos_escaneo()'::regprocedure;

DO $$
DECLARE
  v_case record;
  v_result text;
BEGIN
  IF public.pacientes_nucleo_escaneo('JosÃ© A.', 'PeÃ±a PeÃ±a')
      IS DISTINCT FROM ARRAY['jose', 'pena', 'pena']::text[]
    OR public.pacientes_nucleo_escaneo('Ł A 12', '李') IS DISTINCT FROM ARRAY['12']::text[]
    OR public.duplicados_multiset_contains(ARRAY['aa', 'bb'], ARRAY['aa', 'aa']) THEN
    RAISE EXCEPTION 'Core normalization or multiplicity differs from import semantics';
  END IF;
  FOR v_case IN SELECT * FROM (VALUES
    (ARRAY['aa','bb'], ARRAY['aa','bb'], DATE '1990-01-01', NULL, NULL, NULL, NULL, 'exacta'),
    (ARRAY['aa','bb'], ARRAY['aa','bb'], DATE '1990-01-01', '123', '456', 'a', 'b', 'parcial'),
    (ARRAY['aa','bb'], ARRAY['aa','bb'], DATE '1990-01-01', '123', '456', 'a', NULL, 'exacta'),
    (ARRAY['aa','bb'], ARRAY['aa','bb','bb'], DATE '1990-01-01', NULL, NULL, NULL, NULL, 'parcial'),
    (ARRAY['aa','aa'], ARRAY['aa','bb'], DATE '1990-01-01', NULL, NULL, NULL, NULL, NULL),
    (ARRAY['aa','bb'], ARRAY['aa','bb'], DATE '1991-01-01', '123', '123', NULL, NULL, 'parcial'),
    (ARRAY['aa','bb'], ARRAY['aa','bb'], DATE '1991-01-01', '', '', NULL, NULL, NULL),
    (ARRAY['aa','bb'], ARRAY['aa','bb','cc'], DATE '1991-01-01', '123', '123', NULL, NULL, NULL),
    (ARRAY[]::text[], ARRAY['aa'], DATE '1990-01-01', NULL, NULL, NULL, NULL, 'parcial'),
    (ARRAY['aa'], ARRAY['aa'], NULL::date, '123', '123', NULL, NULL, NULL)
  ) AS cases(core_a, core_b, dob_b, phone_a, phone_b, email_a, email_b, expected)
  LOOP
    v_result := public.pacientes_nivel_escaneo(v_case.core_a, DATE '1990-01-01',
      v_case.phone_a, v_case.email_a, v_case.core_b, v_case.dob_b, v_case.phone_b, v_case.email_b);
    IF v_result IS DISTINCT FROM v_case.expected THEN
      RAISE EXCEPTION 'Classifier case % returned %', row_to_json(v_case), v_result;
    END IF;
  END LOOP;
END $$;

INSERT INTO public.roles (key, label) VALUES
  ('d08_allowed', 'Scan allowed'), ('d08_denied', 'Scan denied');
INSERT INTO public.role_modules (role_key, module_slug) VALUES ('d08_allowed', 'medical');
INSERT INTO auth.users (id, email) VALUES
  ('d0800000-0000-0000-0000-000000000101', 'd08-allowed@example.invalid'),
  ('d0800000-0000-0000-0000-000000000102', 'd08-denied@example.invalid');
INSERT INTO public.usuarios (id, auth_id, email, nombre, apellido, rol) VALUES
  ('d0800000-0000-0000-0000-000000000201', 'd0800000-0000-0000-0000-000000000101',
   'd08-allowed@example.invalid', 'Scan', 'Allowed', 'd08_allowed'),
  ('d0800000-0000-0000-0000-000000000202', 'd0800000-0000-0000-0000-000000000102',
   'd08-denied@example.invalid', 'Scan', 'Denied', 'd08_denied');
INSERT INTO public.pacientes (id, mrn, nombre, apellido, fecha_nacimiento) VALUES
  ('d0800000-0000-0000-0000-000000000001', 'D08-1', 'Maria', 'Hernandez', '1990-05-01'),
  ('d0800000-0000-0000-0000-000000000002', 'D08-2', 'Hernandez', 'Maria', '1990-05-01'),
  ('d0800000-0000-0000-0000-000000000003', 'D08-3', 'Maria', 'Ernandez', '1990-05-01'),
  ('d0800000-0000-0000-0000-000000000004', 'D08-4', 'Maria', 'Hernandez', NULL);

UPDATE public.pacientes SET telefono = 'scan-shared-phone'
  WHERE id = 'd0800000-0000-0000-0000-000000000001';
INSERT INTO public.pacientes (id, mrn, nombre, apellido, fecha_nacimiento, telefono) VALUES
  ('d0800000-0000-0000-0000-000000000005', 'D08-5', 'Maria', 'Hernandez',
    '2001-09-09', 'scan-shared-phone'),
  ('d0800000-0000-0000-0000-000000000006', 'D08-6', 'Zara Maria', 'Hernandez Hernandez',
    '1990-05-01', NULL);

CREATE FUNCTION pg_temp.assert_rejected(p_sql text, p_state text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_state text;
BEGIN
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE;
  END;
  IF v_state IS DISTINCT FROM p_state THEN
    RAISE EXCEPTION 'Expected SQLSTATE %, got %', p_state, v_state;
  END IF;
END $$;

-- Metadata only: direct denied anon RPC execution crashes this local PG17.6 instance.
DO $$
BEGIN
  IF has_function_privilege('anon', 'public.escanear_duplicados(text)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.escanear_duplicados(text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.pacientes_candidatos_escaneo()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Unexpected scan ACL';
  END IF;
  IF EXISTS (SELECT 1 FROM public.pacientes_candidatos_escaneo()
      WHERE item_id_a >= item_id_b OR item_id_a = 'd0800000-0000-0000-0000-000000000004'
         OR item_id_b = 'd0800000-0000-0000-0000-000000000004') THEN
    RAISE EXCEPTION 'Unordered, self, or NULL-DOB candidate';
  END IF;
  IF (SELECT count(*) FROM public.pacientes_candidatos_escaneo()
      WHERE item_id_a = 'd0800000-0000-0000-0000-000000000001'
        AND item_id_b IN ('d0800000-0000-0000-0000-000000000005',
          'd0800000-0000-0000-0000-000000000006') AND nivel = 'parcial') <> 2 THEN
    RAISE EXCEPTION 'Blocking lost cross-year phone or different-initial containment matches';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname IN ('duplicados_repair_mojibake',
        'pacientes_nucleo_escaneo', 'duplicados_multiset_contains', 'pacientes_nivel_escaneo')
        AND (has_function_privilege('anon', p.oid, 'EXECUTE')
          OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))) THEN
    RAISE EXCEPTION 'Internal classification helpers must not be exposed';
  END IF;
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'd0800000-0000-0000-0000-000000000102', true);
SELECT pg_temp.assert_rejected($q$SELECT public.escanear_duplicados('pacientes')$q$, '42501');
SELECT pg_temp.assert_rejected($q$SELECT public.escanear_duplicados(NULL)$q$, '22004');
SELECT pg_temp.assert_rejected($q$SELECT public.escanear_duplicados('d08_unknown')$q$, '22023');
SELECT set_config('request.jwt.claim.sub', 'd0800000-0000-0000-0000-000000000101', true);
SELECT public.escanear_duplicados('pacientes');
SELECT public.escanear_duplicados('pacientes');
DO $$
BEGIN
  IF (SELECT count(*) FROM public.duplicados_pendientes
      WHERE entidad = 'pacientes' AND item_id_a = 'd0800000-0000-0000-0000-000000000001'
        AND item_id_b = 'd0800000-0000-0000-0000-000000000002'
        AND nivel = 'exacta' AND origen = 'escaneo') <> 1 THEN
    RAISE EXCEPTION 'Expected one exact scan candidate after two scans';
  END IF;
  IF EXISTS (SELECT 1 FROM public.duplicados_pendientes
      WHERE entidad = 'pacientes' AND item_id_a = 'd0800000-0000-0000-0000-000000000001'
        AND item_id_b = 'd0800000-0000-0000-0000-000000000003') THEN
    RAISE EXCEPTION 'Phonetic similarity alone is not an import candidate';
  END IF;
END $$;
SELECT public.decidir_descarte_duplicado('pacientes',
  'd0800000-0000-0000-0000-000000000001', 'd0800000-0000-0000-0000-000000000002',
  'no_son_la_misma', NULL);
SELECT public.escanear_duplicados('pacientes');
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.duplicados_pendientes WHERE entidad = 'pacientes'
      AND item_id_a = 'd0800000-0000-0000-0000-000000000001'
      AND item_id_b = 'd0800000-0000-0000-0000-000000000002') THEN
    RAISE EXCEPTION 'Scan resurrected discarded pair';
  END IF;
END $$;
RESET ROLE;

-- Transaction-scoped registry fixtures exercise dispatch without replacing application functions.
CREATE FUNCTION public.d08_scan_fixture()
RETURNS TABLE (item_id_a uuid, item_id_b uuid, nivel text)
LANGUAGE sql AS $$ SELECT NULL::uuid, NULL::uuid, NULL::text WHERE false $$;
INSERT INTO public.duplicados_entidades (entidad, tabla, modulo, funcion_candidatos)
  SELECT 'd08_fixture', tabla, modulo, 'd08_scan_fixture'
  FROM public.duplicados_entidades WHERE entidad = 'pacientes';
SET LOCAL ROLE authenticated;
SELECT public.escanear_duplicados('d08_fixture');
RESET ROLE;

CREATE OR REPLACE FUNCTION public.d08_scan_fixture()
RETURNS TABLE (item_id_a uuid, item_id_b uuid, nivel text)
LANGUAGE sql AS $$ SELECT 'd0800000-0000-0000-0000-000000000091'::uuid,
  'd0800000-0000-0000-0000-000000000092'::uuid, 'exacta'::text $$;
SET LOCAL ROLE authenticated;
SELECT public.escanear_duplicados('d08_fixture');
RESET ROLE;

CREATE OR REPLACE FUNCTION public.d08_scan_fixture()
RETURNS TABLE (item_id_a uuid, item_id_b uuid, nivel text)
LANGUAGE sql AS $$ SELECT 'd0800000-0000-0000-0000-000000000001'::uuid,
  'd0800000-0000-0000-0000-000000000002'::uuid, 'invalid-level'::text $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_rejected($q$SELECT public.escanear_duplicados('d08_fixture')$q$, '23514');
RESET ROLE;

CREATE OR REPLACE FUNCTION public.d08_scan_fixture()
RETURNS TABLE (item_id_a uuid, item_id_b uuid, nivel text)
LANGUAGE plpgsql AS $$ BEGIN
  RAISE EXCEPTION 'Unexpected candidate source failure' USING ERRCODE = '22023';
END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_rejected($q$SELECT public.escanear_duplicados('d08_fixture')$q$, '22023');
RESET ROLE;
ROLLBACK;
