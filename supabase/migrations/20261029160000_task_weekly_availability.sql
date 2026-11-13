-- Tasks weekly availability: one table of recurring weekly ranges a user owns, self-edit
-- only, team-scoped reads, admin read-all. Delivery 1 only -- no dated exceptions, no
-- history, no approvals. Approved design:
-- docs/superpowers/specs/2026-10-09-task-availability-design.md

-- ---------------------------------------------------------------------------
-- 0. Module slug baseline.
--
-- `role_modules.module_slug` is plain text with no FK behind it, and `has_module()` opens
-- with `is_admin() OR ...`: a misspelled slug returns true for the admin -- the person who
-- writes and tests this migration -- and false for everyone else, silently. The slug is
-- declared once here and the migration aborts if no role actually carries it.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 1. The table.
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

CREATE TABLE public.user_weekly_availability_ranges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  starts_at time NOT NULL,
  ends_at time NOT NULL,
  note text NULL CHECK (note IS NULL OR char_length(note) <= 280),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_weekly_availability_ranges_positive_duration
    CHECK (starts_at < ends_at),
  CONSTRAINT user_weekly_availability_ranges_no_overlap
    EXCLUDE USING gist (
      user_id WITH =,
      weekday WITH =,
      tsrange(
        timestamp '2000-01-01' + starts_at,
        timestamp '2000-01-01' + ends_at,
        '[)'
      ) WITH &&
    )
);

CREATE INDEX user_weekly_availability_ranges_owner_day_start_idx
  ON public.user_weekly_availability_ranges (user_id, weekday, starts_at);

ALTER TABLE public.user_weekly_availability_ranges ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. Access predicates.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_active_tasks_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT u.id
  FROM public.usuarios u
  WHERE u.auth_id = auth.uid()
    AND u.activo = true
    AND public.has_module('tasks')
  LIMIT 1
$$;

-- The single definition of "who may see this owner's schedule": owner themself, admin,
-- or a same-team caller whose own module access is live. Reused as-is by the SELECT
-- policy and by get_visible_weekly_availability() below -- never re-derived inline.
CREATE OR REPLACE FUNCTION public.can_read_weekly_availability(p_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH caller AS (
    SELECT u.id, u.equipo_id
    FROM public.usuarios u
    WHERE u.auth_id = auth.uid()
      AND u.activo = true
      AND public.has_module('tasks')
    LIMIT 1
  ), owner AS (
    SELECT u.id, u.equipo_id, u.activo, u.rol
    FROM public.usuarios u
    WHERE u.id = p_owner_id
  )
  SELECT EXISTS (
    SELECT 1
    FROM caller
    JOIN owner ON owner.activo = true
    WHERE EXISTS (
      SELECT 1
      FROM public.role_modules rm
      WHERE rm.role_key = owner.rol
        AND rm.module_slug = 'tasks'
    )
      AND (
        caller.id = owner.id
        OR public.is_admin()
        OR (
          caller.equipo_id IS NOT NULL
          AND owner.equipo_id IS NOT NULL
          AND caller.equipo_id = owner.equipo_id
        )
      )
  )
$$;

REVOKE ALL ON FUNCTION public.current_active_tasks_user_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_read_weekly_availability(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_active_tasks_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_weekly_availability(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Policies. Each predicate names a property of the caller or their relation to the
--    row owner -- never `true` for having a session.
-- ---------------------------------------------------------------------------
CREATE POLICY task_availability_select
ON public.user_weekly_availability_ranges
FOR SELECT TO authenticated
USING (public.can_read_weekly_availability(user_id));

CREATE POLICY task_availability_insert_own
ON public.user_weekly_availability_ranges
FOR INSERT TO authenticated
WITH CHECK (user_id = public.current_active_tasks_user_id());

CREATE POLICY task_availability_update_own
ON public.user_weekly_availability_ranges
FOR UPDATE TO authenticated
USING (user_id = public.current_active_tasks_user_id())
WITH CHECK (user_id = public.current_active_tasks_user_id());

CREATE POLICY task_availability_delete_own
ON public.user_weekly_availability_ranges
FOR DELETE TO authenticated
USING (user_id = public.current_active_tasks_user_id());

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.user_weekly_availability_ranges TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Atomic self-replace. Writes ONE table (DELETE+INSERT on itself): no cross-table
--    concurrency strategy applies. `SECURITY INVOKER` so RLS still gates the writes.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 5. One aggregate read for the Tasks availability screen: self, same-team, or
--    admin read-all, restricted to active users who still carry the `tasks` module.
--    Reuses can_read_weekly_availability() instead of re-deriving the same predicate.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_visible_weekly_availability()
RETURNS TABLE (
  user_id uuid,
  first_name text,
  last_name text,
  team_id uuid,
  team_name text,
  workday_id uuid,
  workday_name text,
  hours_per_day numeric,
  range_id uuid,
  weekday smallint,
  starts_at time,
  ends_at time,
  note text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    owner.id,
    owner.nombre,
    owner.apellido,
    owner.equipo_id,
    team.nombre,
    CASE WHEN workday.activo = true THEN workday.id END,
    CASE WHEN workday.activo = true THEN workday.nombre END,
    CASE WHEN workday.activo = true THEN workday.horas_dia END,
    ranges.id,
    ranges.weekday,
    ranges.starts_at,
    ranges.ends_at,
    ranges.note
  FROM public.usuarios owner
  LEFT JOIN public.equipos team ON team.id = owner.equipo_id
  LEFT JOIN public.jornadas workday ON workday.id = owner.jornada_id
  LEFT JOIN public.user_weekly_availability_ranges ranges ON ranges.user_id = owner.id
  WHERE public.can_read_weekly_availability(owner.id)
  ORDER BY owner.nombre, owner.apellido, ranges.weekday, ranges.starts_at
$$;

REVOKE ALL ON FUNCTION public.get_visible_weekly_availability() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_visible_weekly_availability() TO authenticated;
