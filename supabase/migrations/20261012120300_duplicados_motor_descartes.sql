-- Both public operations share authorization and the registrar's lock protocol.
CREATE OR REPLACE FUNCTION public.lock_duplicate_discard_pair(
  p_entidad text,
  p_item_id_a uuid,
  p_item_id_b uuid
) RETURNS TABLE (first_id uuid, second_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_table text;
  v_module text;
  v_id uuid;
  v_locked_id uuid;
BEGIN
  IF p_entidad IS NULL OR p_item_id_a IS NULL OR p_item_id_b IS NULL THEN
    RAISE EXCEPTION 'Duplicate pair inputs must not be null' USING ERRCODE = '22004';
  END IF;
  SELECT tabla, modulo INTO v_table, v_module
    FROM public.duplicados_entidades WHERE entidad = p_entidad;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown duplicate entity' USING ERRCODE = '22023';
  END IF;
  IF public.has_module(v_module) IS NOT TRUE THEN
    RAISE EXCEPTION 'Duplicate entity module access denied' USING ERRCODE = '42501';
  END IF;
  IF p_item_id_a = p_item_id_b THEN
    RAISE EXCEPTION 'Duplicate candidate IDs must differ' USING ERRCODE = '22023';
  END IF;

  first_id := least(p_item_id_a, p_item_id_b);
  second_id := greatest(p_item_id_a, p_item_id_b);
  PERFORM pg_advisory_xact_lock(hashtext(p_entidad || '|' || first_id::text || '|' || second_id::text));
  -- Stable domain-row order also serializes overlapping pairs against merges.
  FOREACH v_id IN ARRAY ARRAY[first_id, second_id] LOOP
    EXECUTE format('SELECT id FROM public.%I WHERE id = $1 FOR UPDATE', v_table)
      INTO v_locked_id USING v_id;
    IF v_locked_id IS NULL THEN
      RAISE EXCEPTION 'Both duplicate candidate rows must exist' USING ERRCODE = '22023';
    END IF;
  END LOOP;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.lock_duplicate_discard_pair(text, uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.decidir_descarte_duplicado(
  p_entidad text,
  p_item_id_a uuid,
  p_item_id_b uuid,
  p_motivo text,
  p_nota text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_pair record;
BEGIN
  IF p_entidad IS NULL OR p_item_id_a IS NULL OR p_item_id_b IS NULL OR p_motivo IS NULL THEN
    RAISE EXCEPTION 'Duplicate discard inputs must not be null' USING ERRCODE = '22004';
  END IF;
  SELECT * INTO v_pair FROM public.lock_duplicate_discard_pair(p_entidad, p_item_id_a, p_item_id_b);
  IF p_motivo NOT IN ('no_son_la_misma', 'son_la_misma_separadas') THEN
    RAISE EXCEPTION 'Unknown duplicate discard motive' USING ERRCODE = '22023';
  END IF;
  IF p_motivo = 'son_la_misma_separadas' AND (p_nota IS NULL OR p_nota !~ '[^[:space:]]') THEN
    RAISE EXCEPTION 'Keeping the same item separate requires a nonblank note' USING ERRCODE = '22023';
  END IF;

  -- The helper holds the pair advisory lock and both domain locks until transaction end.
  DELETE FROM public.duplicados_pendientes
    WHERE entidad = p_entidad AND item_id_a = v_pair.first_id AND item_id_b = v_pair.second_id;
  INSERT INTO public.duplicados_descartes (entidad, item_id_a, item_id_b, motivo, nota, decidido_por)
    VALUES (p_entidad, v_pair.first_id, v_pair.second_id, p_motivo, p_nota, public.usuario_actual_id())
    ON CONFLICT (entidad, item_id_a, item_id_b) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.deshacer_descarte_duplicado(
  p_entidad text,
  p_item_id_a uuid,
  p_item_id_b uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_pair record;
BEGIN
  IF p_entidad IS NULL OR p_item_id_a IS NULL OR p_item_id_b IS NULL THEN
    RAISE EXCEPTION 'Duplicate undo inputs must not be null' USING ERRCODE = '22004';
  END IF;
  SELECT * INTO v_pair FROM public.lock_duplicate_discard_pair(p_entidad, p_item_id_a, p_item_id_b);
  DELETE FROM public.duplicados_descartes
    WHERE entidad = p_entidad AND item_id_a = v_pair.first_id AND item_id_b = v_pair.second_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Duplicate candidate pair was not discarded' USING ERRCODE = '22023';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.decidir_descarte_duplicado(text, uuid, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decidir_descarte_duplicado(text, uuid, uuid, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.deshacer_descarte_duplicado(text, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deshacer_descarte_duplicado(text, uuid, uuid) TO authenticated;
