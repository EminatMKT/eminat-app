-- `set_actividad_responsables` bumps `actividades.updated_at` itself, but used to return void: the
-- client kept the pre-call timestamp in its local cache, so the very next edit of that task sent a
-- stale `expected_updated_at` and 409'd against nobody — a false "changed in another session".
-- Returning the new timestamp lets the client keep its cache in sync with the one write that
-- already knows the fresh value, instead of re-reading the row in a second round trip.
-- `CREATE OR REPLACE` cannot change a function's return type; the old `void` signature has to go.
DROP FUNCTION IF EXISTS public.set_actividad_responsables(uuid, uuid[], uuid);

CREATE FUNCTION public.set_actividad_responsables(
  p_actividad_id uuid,
  p_usuario_ids uuid[],
  p_lider_id uuid DEFAULT NULL::uuid
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  ids uuid[];
  touched uuid;
  stamp timestamptz;
BEGIN
  SELECT COALESCE(array_agg(DISTINCT usuario_id ORDER BY usuario_id), ARRAY[]::uuid[])
    INTO ids
  FROM unnest(COALESCE(p_usuario_ids, ARRAY[]::uuid[])) AS usuario_id
  WHERE usuario_id IS NOT NULL;

  IF p_lider_id IS NOT NULL AND NOT (p_lider_id = ANY(ids)) THEN
    RAISE EXCEPTION 'lider_fuera_de_responsables'
      USING ERRCODE = '22023';
  END IF;

  -- Lock the task first: a second caller waits here, then replaces the whole set after us.
  SELECT id INTO touched FROM public.actividades WHERE id = p_actividad_id FOR UPDATE;
  IF touched IS NULL THEN
    RAISE EXCEPTION 'actividad_no_visible_o_no_editable: %', p_actividad_id
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.actividades SET updated_at = now() WHERE id = p_actividad_id
    RETURNING updated_at INTO stamp;

  DELETE FROM public.actividad_responsables
   WHERE actividad_id = p_actividad_id;

  INSERT INTO public.actividad_responsables (actividad_id, usuario_id, es_lider)
  SELECT p_actividad_id, usuario_id, usuario_id = p_lider_id
  FROM unnest(ids) AS usuario_id;

  RETURN stamp;
END;
$$;

-- `DROP FUNCTION` above also dropped its grants; the signature is unchanged, so these repeat the
-- originals.
REVOKE ALL ON FUNCTION public.set_actividad_responsables(uuid, uuid[], uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_actividad_responsables(uuid, uuid[], uuid) TO authenticated, service_role;
