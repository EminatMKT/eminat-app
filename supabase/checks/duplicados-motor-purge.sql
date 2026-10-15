\set ON_ERROR_STOP on
BEGIN;
SELECT 'public.pacientes_purgar_duplicados()'::regprocedure;

-- Explicit MRNs keep the nontransactional sequence unchanged.
INSERT INTO public.pacientes (id, mrn, nombre, apellido) VALUES
  ('d0a00000-0000-0000-0000-000000000001', 'PURGE-1', 'Purge', 'Deleted'),
  ('d0a00000-0000-0000-0000-000000000002', 'PURGE-2', 'Purge', 'Kept'),
  ('d0a00000-0000-0000-0000-000000000003', 'PURGE-3', 'Purge', 'Other');
INSERT INTO public.duplicados_entidades (entidad, tabla, modulo, funcion_candidatos) VALUES
  ('purge_other', 'pacientes', 'medical', 'unused_check');
INSERT INTO public.duplicados_pendientes (entidad, item_id_a, item_id_b, nivel, origen) VALUES
  ('pacientes', 'd0a00000-0000-0000-0000-000000000001', 'd0a00000-0000-0000-0000-000000000002', 'exacta', 'import'),
  ('pacientes', 'd0a00000-0000-0000-0000-000000000002', 'd0a00000-0000-0000-0000-000000000003', 'parcial', 'import'),
  ('purge_other', 'd0a00000-0000-0000-0000-000000000001', 'd0a00000-0000-0000-0000-000000000002', 'parcial', 'import');
INSERT INTO public.duplicados_descartes (entidad, item_id_a, item_id_b, motivo) VALUES
  ('pacientes', 'd0a00000-0000-0000-0000-000000000001', 'd0a00000-0000-0000-0000-000000000003', 'no_son_la_misma'),
  ('purge_other', 'd0a00000-0000-0000-0000-000000000001', 'd0a00000-0000-0000-0000-000000000003', 'no_son_la_misma');

DELETE FROM public.pacientes WHERE id = 'd0a00000-0000-0000-0000-000000000001';

DO $$
DECLARE v_deleted uuid := 'd0a00000-0000-0000-0000-000000000001';
BEGIN
  IF EXISTS (SELECT 1 FROM public.duplicados_pendientes WHERE entidad = 'pacientes' AND v_deleted IN (item_id_a, item_id_b))
     OR EXISTS (SELECT 1 FROM public.duplicados_descartes WHERE entidad = 'pacientes' AND v_deleted IN (item_id_a, item_id_b)) THEN
    RAISE EXCEPTION 'Deleting a patient must purge its pending pairs and discards';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.duplicados_pendientes WHERE entidad = 'pacientes'
       AND item_id_a = 'd0a00000-0000-0000-0000-000000000002' AND item_id_b = 'd0a00000-0000-0000-0000-000000000003')
     OR NOT EXISTS (SELECT 1 FROM public.duplicados_pendientes WHERE entidad = 'purge_other' AND item_id_a = v_deleted)
     OR NOT EXISTS (SELECT 1 FROM public.duplicados_descartes WHERE entidad = 'purge_other' AND item_id_a = v_deleted) THEN
    RAISE EXCEPTION 'The purge must leave unrelated pairs and other entities untouched';
  END IF;
  IF has_function_privilege('anon', 'public.pacientes_purgar_duplicados()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.pacientes_purgar_duplicados()', 'EXECUTE') THEN
    RAISE EXCEPTION 'The purge trigger function must not be callable directly';
  END IF;
END $$;
ROLLBACK;
\echo 'PASS: deleting a patient purges its duplicate pairs (fixtures rolled back)'
