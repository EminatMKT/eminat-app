CREATE OR REPLACE FUNCTION public.duplicados_repair_mojibake(p_value text)
RETURNS text LANGUAGE plpgsql IMMUTABLE STRICT
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  RETURN convert_from(convert_to(p_value, 'LATIN1'), 'UTF8');
EXCEPTION WHEN character_not_in_repertoire OR untranslatable_character THEN
  RETURN p_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.pacientes_nucleo_escaneo(p_first text, p_last text)
RETURNS text[] LANGUAGE sql IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT coalesce(array_agg(token ORDER BY token COLLATE "C"), ARRAY[]::text[])
  FROM regexp_split_to_table(
    regexp_replace(lower(regexp_replace(
      normalize(public.duplicados_repair_mojibake(coalesce(p_first, '') || ' ' || coalesce(p_last, '')), NFD),
      U&'[\0300-\036f]', '', 'g')), '[^a-z0-9]', ' ', 'g'), ' +') AS token
  WHERE length(token) >= 2;
$$;

-- EXCEPT ALL preserves repeated surnames; array containment does not.
CREATE OR REPLACE FUNCTION public.duplicados_multiset_contains(p_large text[], p_small text[])
RETURNS boolean LANGUAGE sql IMMUTABLE STRICT
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT NOT EXISTS (SELECT unnest(p_small) EXCEPT ALL SELECT unnest(p_large));
$$;

CREATE OR REPLACE FUNCTION public.pacientes_nivel_escaneo(
  p_core_a text[], p_dob_a date, p_phone_a text, p_email_a text,
  p_core_b text[], p_dob_b date, p_phone_b text, p_email_b text
) RETURNS text LANGUAGE sql IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT CASE
    WHEN p_dob_a IS NULL OR p_dob_b IS NULL THEN NULL
    WHEN p_dob_a <> p_dob_b THEN CASE
      WHEN p_core_a = p_core_b AND nullif(p_phone_a, '') IS NOT NULL
        AND p_phone_a = p_phone_b THEN 'parcial' END
    WHEN p_core_a = p_core_b THEN CASE
      WHEN nullif(p_phone_a, '') IS NOT NULL AND nullif(p_phone_b, '') IS NOT NULL
        AND nullif(p_email_a, '') IS NOT NULL AND nullif(p_email_b, '') IS NOT NULL
        AND p_phone_a <> p_phone_b AND p_email_a <> p_email_b THEN 'parcial'
      ELSE 'exacta' END
    WHEN public.duplicados_multiset_contains(p_core_a, p_core_b)
      OR public.duplicados_multiset_contains(p_core_b, p_core_a) THEN 'parcial'
  END;
$$;

CREATE OR REPLACE FUNCTION public.pacientes_candidatos_escaneo()
RETURNS TABLE (item_id_a uuid, item_id_b uuid, nivel text)
LANGUAGE sql STABLE
SET search_path = pg_catalog, pg_temp
AS $$
  WITH patients AS MATERIALIZED (
    SELECT id, fecha_nacimiento, telefono, email,
      public.pacientes_nucleo_escaneo(nombre, apellido) AS core
    FROM public.pacientes WHERE fecha_nacimiento IS NOT NULL
  ), blocked AS (
    SELECT a AS first_patient, b AS second_patient
    FROM patients a JOIN patients b ON a.fecha_nacimiento = b.fecha_nacimiento AND a.id < b.id
    UNION ALL
    SELECT a AS first_patient, b AS second_patient
    FROM patients a JOIN patients b ON a.core = b.core AND a.telefono = b.telefono
      AND a.fecha_nacimiento <> b.fecha_nacimiento AND a.id < b.id
    WHERE nullif(a.telefono, '') IS NOT NULL
  ), pairs AS (
    SELECT (first_patient).id AS item_id_a, (second_patient).id AS item_id_b,
      public.pacientes_nivel_escaneo(
        (first_patient).core, (first_patient).fecha_nacimiento,
        (first_patient).telefono, (first_patient).email,
        (second_patient).core, (second_patient).fecha_nacimiento,
        (second_patient).telefono, (second_patient).email) AS nivel
    FROM blocked
  )
  SELECT * FROM pairs WHERE pairs.nivel IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.escanear_duplicados(p_entidad text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_module text;
  v_function text;
  v_pair record;
BEGIN
  IF p_entidad IS NULL THEN
    RAISE EXCEPTION 'Duplicate scan entity must not be null' USING ERRCODE = '22004';
  END IF;
  SELECT modulo, funcion_candidatos INTO v_module, v_function
    FROM public.duplicados_entidades WHERE entidad = p_entidad;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown duplicate entity' USING ERRCODE = '22023';
  END IF;
  IF public.has_module(v_module) IS NOT TRUE THEN
    RAISE EXCEPTION 'Duplicate entity module access denied' USING ERRCODE = '42501';
  END IF;
  FOR v_pair IN EXECUTE format(
    'SELECT c.* FROM public.%I() c
     WHERE NOT EXISTS (SELECT 1 FROM public.duplicados_pendientes p
       WHERE p.entidad = $1 AND p.item_id_a = c.item_id_a AND p.item_id_b = c.item_id_b)
       AND NOT EXISTS (SELECT 1 FROM public.duplicados_descartes d
       WHERE d.entidad = $1 AND d.item_id_a = c.item_id_a AND d.item_id_b = c.item_id_b)
     ORDER BY c.item_id_a, c.item_id_b', v_function) USING p_entidad
  LOOP
    BEGIN
      -- Registration owns pair advisory locks and ordered row locks against concurrent merges.
      PERFORM public.registrar_candidato_duplicado(
        p_entidad, v_pair.item_id_a, v_pair.item_id_b, v_pair.nivel, 'escaneo');
    EXCEPTION WHEN SQLSTATE '22023' THEN
      IF SQLERRM NOT IN ('Duplicate candidate pair was already discarded',
        'Both duplicate candidate rows must exist') THEN
        RAISE;
      END IF;
    END;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.duplicados_repair_mojibake(text),
  public.pacientes_nucleo_escaneo(text, text),
  public.duplicados_multiset_contains(text[], text[]),
  public.pacientes_nivel_escaneo(text[], date, text, text, text[], date, text, text),
  public.pacientes_candidatos_escaneo() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.escanear_duplicados(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.escanear_duplicados(text) TO authenticated;
