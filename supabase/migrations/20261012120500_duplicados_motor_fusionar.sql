-- The full rows a merge skipped (a collision with the winner, or the reviewer's exclusion): they
-- go away with the loser, so this is the only copy a revert can re-create them from.
ALTER TABLE public.duplicados_fusiones
  ADD COLUMN IF NOT EXISTS hijos_descartados jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Dropped first: adding a parameter with CREATE OR REPLACE would leave the 4-argument version
-- next to it, and every 4-argument call would then be ambiguous.
DROP FUNCTION IF EXISTS public.fusionar_duplicado(text, uuid, uuid, jsonb);

CREATE OR REPLACE FUNCTION public.fusionar_duplicado(
  p_entidad text,
  p_ganador_id uuid,
  p_perdedor_id uuid,
  p_valores_finales jsonb,
  p_contactos_excluidos uuid[] DEFAULT '{}'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_table text;
  v_module text;
  v_children jsonb;
  v_first uuid;
  v_second uuid;
  v_id uuid;
  v_locked_id uuid;
  v_winner jsonb;
  v_loser jsonb;
  v_excluded constant text[] := ARRAY['id', 'mrn', 'created_at', 'updated_at'];
  v_columns text[];
  v_assignments text;
  v_child jsonb;
  v_primary_keys text[];
  v_moved_keys jsonb;
  v_moved jsonb := '[]'::jsonb;
  v_key_match text;
  v_row jsonb;
  v_key jsonb;
  v_dropped_ids text[];
  v_owned bigint := 0;
  v_count bigint;
  v_skipped_rows jsonb;
  v_skipped jsonb := '[]'::jsonb;
BEGIN
  IF p_entidad IS NULL OR p_ganador_id IS NULL OR p_perdedor_id IS NULL OR p_valores_finales IS NULL
     OR p_contactos_excluidos IS NULL THEN
    RAISE EXCEPTION 'Duplicate merge inputs must not be null' USING ERRCODE = '22004';
  END IF;
  SELECT tabla, modulo, hijos INTO v_table, v_module, v_children
    FROM public.duplicados_entidades WHERE entidad = p_entidad;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown duplicate entity' USING ERRCODE = '22023';
  END IF;
  IF public.has_module(v_module) IS NOT TRUE THEN
    RAISE EXCEPTION 'Duplicate entity module access denied' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(p_valores_finales) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Merge values must be a JSON object' USING ERRCODE = '22023';
  END IF;
  IF p_ganador_id = p_perdedor_id THEN
    RAISE EXCEPTION 'Duplicate candidate IDs must differ' USING ERRCODE = '22023';
  END IF;

  v_first := least(p_ganador_id, p_perdedor_id);
  v_second := greatest(p_ganador_id, p_perdedor_id);
  -- Match registrar/discard pair keys; ordered domain locks also serialize overlapping pairs.
  PERFORM pg_advisory_xact_lock(hashtext(p_entidad || '|' || v_first::text || '|' || v_second::text));
  FOREACH v_id IN ARRAY ARRAY[v_first, v_second] LOOP
    EXECUTE format('SELECT id FROM public.%I WHERE id = $1 FOR UPDATE', v_table)
      INTO v_locked_id USING v_id;
    IF v_locked_id IS NULL THEN
      RAISE EXCEPTION 'Both duplicate candidate rows must exist' USING ERRCODE = '22023';
    END IF;
  END LOOP;
  -- Read authoritative state only after all locks; no unlocked snapshot can authorize a merge.
  IF NOT EXISTS (SELECT 1 FROM public.duplicados_pendientes
      WHERE entidad = p_entidad AND item_id_a = v_first AND item_id_b = v_second) THEN
    RAISE EXCEPTION 'Duplicate pair is not pending' USING ERRCODE = '22023';
  END IF;
  EXECUTE format('SELECT to_jsonb(p) FROM public.%I p WHERE id = $1', v_table)
    INTO v_winner USING p_ganador_id;
  EXECUTE format('SELECT to_jsonb(p) FROM public.%I p WHERE id = $1', v_table)
    INTO v_loser USING p_perdedor_id;

  IF EXISTS (SELECT 1 FROM jsonb_object_keys(p_valores_finales) k WHERE k = ANY(v_excluded)) THEN
    RAISE EXCEPTION 'Merge values contain an excluded column' USING ERRCODE = '22023';
  END IF;
  SELECT array_agg(a.attname::text) INTO v_columns FROM pg_attribute a
    WHERE a.attrelid = format('public.%I', v_table)::regclass AND a.attnum > 0 AND NOT a.attisdropped;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(p_valores_finales) k WHERE NOT k = ANY(v_columns)) THEN
    RAISE EXCEPTION 'Merge values contain an unknown column' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_each(p_valores_finales) e
      WHERE e.value IS DISTINCT FROM v_winner->e.key AND e.value IS DISTINCT FROM v_loser->e.key) THEN
    RAISE EXCEPTION 'Merge value does not match either current snapshot' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_columns) k
      WHERE NOT k = ANY(v_excluded) AND v_winner->k IS DISTINCT FROM v_loser->k AND NOT p_valores_finales ? k) THEN
    RAISE EXCEPTION 'Merge values omit a differing column' USING ERRCODE = '22023';
  END IF;

  -- Every excluded id must be the `id` of one of the loser's child rows: anything else (the
  -- winner's row, a third patient's, a NULL) is a malformed call, so the whole merge is refused.
  v_dropped_ids := ARRAY(SELECT DISTINCT e::text FROM unnest(p_contactos_excluidos) e);
  FOR v_child IN SELECT value FROM jsonb_array_elements(v_children) LOOP
    EXECUTE format('SELECT count(*) FROM public.%I c WHERE %I = $1 AND to_jsonb(c)->>''id'' = ANY($2)',
      v_child->>'tabla', v_child->>'columna') INTO v_count USING p_perdedor_id, v_dropped_ids;
    v_owned := v_owned + v_count;
  END LOOP;
  IF v_owned <> cardinality(v_dropped_ids) THEN
    RAISE EXCEPTION 'Excluded child rows must belong to the loser' USING ERRCODE = '22023';
  END IF;

  SELECT string_agg(format('%I = v.%I', k, k), ', ' ORDER BY k) INTO v_assignments
    FROM jsonb_object_keys(p_valores_finales) k;
  -- Equal allowed snapshots need no UPDATE; an empty SET clause is invalid SQL.
  IF v_assignments IS NOT NULL THEN
    EXECUTE format('UPDATE public.%I p SET %s FROM jsonb_populate_record(NULL::public.%I, $1) v WHERE p.id = $2',
      v_table, v_assignments, v_table) USING p_valores_finales, p_ganador_id;
  END IF;

  FOR v_child IN SELECT value FROM jsonb_array_elements(v_children) LOOP
    SELECT array_agg(a.attname::text ORDER BY k.ordinality) INTO v_primary_keys
      FROM pg_index i CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY k(attnum, ordinality)
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
      WHERE i.indrelid = format('public.%I', v_child->>'tabla')::regclass AND i.indisprimary
        AND k.ordinality <= i.indnkeyatts;
    IF v_primary_keys IS NULL THEN
      RAISE EXCEPTION 'Registered child table must have a primary key' USING ERRCODE = '22023';
    END IF;
    SELECT string_agg(format('c.%I = r.%I', k, k), ' AND ') INTO v_key_match FROM unnest(v_primary_keys) k;
    v_moved_keys := '[]'::jsonb;
    v_skipped_rows := '[]'::jsonb;
    -- One block (one savepoint) per row: a row colliding with the winner's own unique key is
    -- skipped, and cascades away with the loser below. Needs ON DELETE CASCADE on the child FK.
    FOR v_row IN EXECUTE format('SELECT to_jsonb(c) FROM public.%I c WHERE %I = $1 ORDER BY to_jsonb(c) FOR UPDATE',
        v_child->>'tabla', v_child->>'columna') USING p_perdedor_id LOOP
      -- An excluded row takes the collision's path: it never moves and cascades away the same way.
      IF v_row->>'id' = ANY(v_dropped_ids) THEN
        v_skipped_rows := v_skipped_rows || jsonb_build_array(v_row);
        CONTINUE;
      END IF;
      BEGIN
        EXECUTE format('UPDATE public.%I c SET %I = $1 FROM jsonb_populate_record(NULL::public.%I, $2) r WHERE %s
          RETURNING (SELECT jsonb_object_agg(e.key, e.value) FROM jsonb_each(to_jsonb(c)) e WHERE e.key = ANY($3))',
          v_child->>'tabla', v_child->>'columna', v_child->>'tabla', v_key_match)
          INTO v_key USING p_ganador_id, v_row, v_primary_keys;
        IF v_key IS NOT NULL THEN
          v_moved_keys := v_moved_keys || jsonb_build_array(v_key);
        END IF;
      EXCEPTION WHEN unique_violation THEN
        -- Variables survive the savepoint rollback: the skipped row is still recorded.
        v_skipped_rows := v_skipped_rows || jsonb_build_array(v_row);
      END;
    END LOOP;
    v_moved := v_moved || jsonb_build_array(jsonb_build_object(
      'tabla', v_child->>'tabla', 'columna', v_child->>'columna', 'claves', v_moved_keys));
    v_skipped := v_skipped || jsonb_build_array(jsonb_build_object(
      'tabla', v_child->>'tabla', 'columna', v_child->>'columna', 'filas', v_skipped_rows));
  END LOOP;

  EXECUTE format('DELETE FROM public.%I WHERE id = $1', v_table) USING p_perdedor_id;
  DELETE FROM public.duplicados_pendientes
    WHERE entidad = p_entidad AND p_perdedor_id IN (item_id_a, item_id_b);
  DELETE FROM public.duplicados_descartes
    WHERE entidad = p_entidad AND p_perdedor_id IN (item_id_a, item_id_b);
  INSERT INTO public.duplicados_fusiones
    (entidad, ganador_id, perdedor_id, perdedor_snapshot, ganador_snapshot_previo, hijos_movidos, hijos_descartados, decidido_por)
    VALUES (p_entidad, p_ganador_id, p_perdedor_id, v_loser, v_winner, v_moved, v_skipped, public.usuario_actual_id());
END;
$$;

REVOKE ALL ON FUNCTION public.fusionar_duplicado(text, uuid, uuid, jsonb, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fusionar_duplicado(text, uuid, uuid, jsonb, uuid[]) TO authenticated;
