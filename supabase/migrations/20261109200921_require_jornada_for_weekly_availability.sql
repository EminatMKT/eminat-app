-- Declaring weekly availability now requires an assigned, active jornada. The editor
-- already goes read-only when `workday` is null; this makes the RPC reject the same
-- write server-side, so the rule doesn't depend on the client. Existing ranges of a
-- user who loses their jornada stay as they are: only new saves are refused.

DO $$
DECLARE
  module_slug_constant constant text := 'tasks';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.role_modules
    WHERE module_slug = module_slug_constant
  ) THEN
    RAISE EXCEPTION 'Missing module grant baseline: %', module_slug_constant;
  END IF;
END $$;

-- SECURITY DEFINER so the usuarios/jornadas lookup isn't filtered by the caller's RLS:
-- the invoker-rights RPC below would otherwise risk a false rejection. "Active" matches
-- get_visible_weekly_availability(), which reports workday as null when jornadas.activo
-- is false -- the same null the editor gates on.
CREATE OR REPLACE FUNCTION public.current_user_has_active_jornada(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios u
    JOIN public.jornadas workday ON workday.id = u.jornada_id
    WHERE u.id = p_user_id
      AND workday.activo = true
  )
$$;

REVOKE ALL ON FUNCTION public.current_user_has_active_jornada(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_has_active_jornada(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.replace_own_weekly_availability(p_ranges jsonb)
RETURNS SETOF public.user_weekly_availability_ranges
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := public.current_active_tasks_user_id();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'TASKS_ACCESS_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF NOT public.current_user_has_active_jornada(v_user_id) THEN
    RAISE EXCEPTION 'TASKS_JORNADA_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(p_ranges) <> 'array' THEN
    RAISE EXCEPTION 'INVALID_AVAILABILITY_RANGES' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_ranges) item
    WHERE item ? 'user_id'
       OR NOT (item ? 'weekday' AND item ? 'starts_at' AND item ? 'ends_at')
       OR (item - 'weekday' - 'starts_at' - 'ends_at' - 'note') <> '{}'::jsonb
  ) THEN
    RAISE EXCEPTION 'INVALID_AVAILABILITY_RANGE_FIELDS' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.user_weekly_availability_ranges
  WHERE user_id = v_user_id;

  INSERT INTO public.user_weekly_availability_ranges (
    user_id,
    weekday,
    starts_at,
    ends_at,
    note
  )
  SELECT
    v_user_id,
    parsed.weekday,
    parsed.starts_at,
    parsed.ends_at,
    nullif(btrim(parsed.note), '')
  FROM jsonb_to_recordset(p_ranges) AS parsed(
    weekday smallint,
    starts_at time,
    ends_at time,
    note text
  );

  RETURN QUERY
  SELECT item.*
  FROM public.user_weekly_availability_ranges item
  WHERE item.user_id = v_user_id
  ORDER BY item.weekday, item.starts_at;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_own_weekly_availability(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_own_weekly_availability(jsonb) TO authenticated;
