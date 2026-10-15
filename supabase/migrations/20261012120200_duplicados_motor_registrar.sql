CREATE OR REPLACE FUNCTION public.registrar_candidato_duplicado(
  p_entidad text,
  p_item_id_a uuid,
  p_item_id_b uuid,
  p_nivel text,
  p_origen text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_table text;
  v_module text;
  v_first uuid;
  v_second uuid;
  v_id uuid;
  v_locked_id uuid;
BEGIN
  IF p_entidad IS NULL OR p_item_id_a IS NULL OR p_item_id_b IS NULL
     OR p_nivel IS NULL OR p_origen IS NULL THEN
    RAISE EXCEPTION 'Duplicate candidate inputs must not be null' USING ERRCODE = '22004';
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

  v_first := least(p_item_id_a, p_item_id_b);
  v_second := greatest(p_item_id_a, p_item_id_b);
  -- Discard and merge RPCs must use this same entity-qualified pair key.
  PERFORM pg_advisory_xact_lock(hashtext(p_entidad || '|' || v_first::text || '|' || v_second::text));

  -- Ordered domain locks serialize overlapping pairs against concurrent merges.
  FOREACH v_id IN ARRAY ARRAY[v_first, v_second] LOOP
    EXECUTE format('SELECT id FROM public.%I WHERE id = $1 FOR UPDATE', v_table)
      INTO v_locked_id USING v_id;
    IF v_locked_id IS NULL THEN
      RAISE EXCEPTION 'Both duplicate candidate rows must exist' USING ERRCODE = '22023';
    END IF;
  END LOOP;

  IF EXISTS (SELECT 1 FROM public.duplicados_descartes
      WHERE entidad = p_entidad AND item_id_a = v_first AND item_id_b = v_second) THEN
    RAISE EXCEPTION 'Duplicate candidate pair was already discarded' USING ERRCODE = '22023';
  END IF;

  -- Re-detection intentionally preserves the first observation, including its origin.
  INSERT INTO public.duplicados_pendientes (entidad, item_id_a, item_id_b, nivel, origen)
    VALUES (p_entidad, v_first, v_second, p_nivel, p_origen)
    ON CONFLICT (entidad, item_id_a, item_id_b) DO NOTHING;
END;
$$;

-- Supabase can grant anon directly through default privileges, independently of PUBLIC.
REVOKE ALL ON FUNCTION public.registrar_candidato_duplicado(text, uuid, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_candidato_duplicado(text, uuid, uuid, text, text) TO authenticated;
