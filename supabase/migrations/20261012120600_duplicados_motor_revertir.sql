CREATE OR REPLACE FUNCTION public.revertir_fusion_duplicado(p_fusion_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_entidad                 text;
  v_tabla                   text;
  v_modulo                  text;
  v_ganador_id              uuid;
  v_perdedor_id             uuid;
  v_decidido_at             timestamptz;
  v_revertido_at            timestamptz;
  v_perdedor_snapshot       jsonb;
  v_ganador_snapshot_previo jsonb;
  v_hijos_movidos           jsonb;
  v_hijo                    jsonb;
  v_locked_id               uuid;
  v_assignments             text;
  v_col_defs                text;
  v_join_cond               text;
BEGIN
  SELECT entidad, ganador_id, perdedor_id, decidido_at, revertido_at,
         perdedor_snapshot, ganador_snapshot_previo, hijos_movidos
    INTO v_entidad, v_ganador_id, v_perdedor_id, v_decidido_at, v_revertido_at,
         v_perdedor_snapshot, v_ganador_snapshot_previo, v_hijos_movidos
    FROM public.duplicados_fusiones WHERE id = p_fusion_id FOR UPDATE;

  IF v_entidad IS NULL THEN
    RAISE EXCEPTION 'fusion % does not exist', p_fusion_id;
  END IF;
  IF v_revertido_at IS NOT NULL THEN
    RAISE EXCEPTION 'this merge was already reverted';
  END IF;

  SELECT tabla, modulo INTO v_tabla, v_modulo
    FROM public.duplicados_entidades WHERE entidad = v_entidad;
  IF public.has_module(v_modulo) IS NOT TRUE THEN
    RAISE EXCEPTION 'Duplicate entity module access denied' USING ERRCODE = '42501';
  END IF;

  EXECUTE format('SELECT id FROM public.%I WHERE id = $1 FOR UPDATE', v_tabla)
    INTO v_locked_id USING v_ganador_id;
  IF v_locked_id IS NULL THEN
    RAISE EXCEPTION 'cannot revert: the winner row no longer exists';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.duplicados_fusiones f2
    WHERE f2.entidad = v_entidad AND f2.decidido_at > v_decidido_at AND f2.revertido_at IS NULL
      AND (f2.ganador_id = v_ganador_id OR f2.perdedor_id = v_ganador_id)
  ) THEN
    RAISE EXCEPTION 'cannot revert: this item merged again later';
  END IF;

  -- Restore the winner's full pre-merge row from its snapshot.
  SELECT string_agg(format('%I = v.%I', k, k), ', ' ORDER BY k)
    INTO v_assignments
    FROM jsonb_object_keys(v_ganador_snapshot_previo) k;
  EXECUTE format(
    'UPDATE public.%I p SET %s FROM jsonb_populate_record(NULL::public.%I, $1) v WHERE p.id = $2',
    v_tabla, v_assignments, v_tabla
  ) USING v_ganador_snapshot_previo, v_ganador_id;

  -- Recreate the loser row exactly as it was, typed via jsonb_populate_record.
  EXECUTE format(
    'INSERT INTO public.%I SELECT (jsonb_populate_record(NULL::public.%I, $1)).*',
    v_tabla, v_tabla
  ) USING v_perdedor_snapshot;

  -- Move back only the exact child rows recorded at merge time, matched by their own PK columns.
  FOR v_hijo IN SELECT * FROM jsonb_array_elements(v_hijos_movidos) LOOP
    SELECT
      string_agg(quote_ident(a.attname) || ' ' || format_type(a.atttypid, a.atttypmod),
                 ', ' ORDER BY k.ordinality),
      string_agg(format('child.%I = r.%I', a.attname, a.attname), ' AND ' ORDER BY k.ordinality)
      INTO v_col_defs, v_join_cond
      FROM pg_index i CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY k(attnum, ordinality)
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
      WHERE i.indrelid = format('public.%I', v_hijo->>'tabla')::regclass AND i.indisprimary
        AND k.ordinality <= i.indnkeyatts;
    IF v_col_defs IS NULL THEN
      RAISE EXCEPTION 'Registered child table must have a primary key';
    END IF;

    EXECUTE format(
      'UPDATE public.%I AS child SET %I = $1 FROM jsonb_to_recordset($2) AS r(%s) WHERE %s',
      v_hijo->>'tabla', v_hijo->>'columna', v_col_defs, v_join_cond
    ) USING v_perdedor_id, v_hijo->'claves';
  END LOOP;

  UPDATE public.duplicados_fusiones
    SET revertido_por = public.usuario_actual_id(), revertido_at = now()
    WHERE id = p_fusion_id;
END;
$$;

REVOKE ALL ON FUNCTION public.revertir_fusion_duplicado(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revertir_fusion_duplicado(uuid) TO authenticated;
