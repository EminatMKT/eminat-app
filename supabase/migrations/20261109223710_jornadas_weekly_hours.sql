-- A jornada now stores the hours it owes per WEEK. `horas_dia` times seven expected 56 h of a
-- full-time member, weekends included. `horas_dia` stays (dropping it is irreversible in prod);
-- the app stops reading it. The backfill assumes the five-day week both jornadas meant.

ALTER TABLE public.jornadas ADD COLUMN horas_semana numeric(5,2);

UPDATE public.jornadas SET horas_semana = horas_dia * 5;

ALTER TABLE public.jornadas ALTER COLUMN horas_semana SET NOT NULL;

ALTER TABLE public.jornadas
  ADD CONSTRAINT jornadas_horas_semana_check CHECK (horas_semana > 0 AND horas_semana <= 168);

-- The RPC's OUT column changes name (hours_per_day -> hours_per_week), which CREATE OR REPLACE
-- cannot do: drop and recreate, then restore the exact grants the live function carried.
DROP FUNCTION public.get_visible_weekly_availability();

CREATE FUNCTION public.get_visible_weekly_availability()
 RETURNS TABLE(user_id uuid, first_name text, last_name text, team_id uuid, team_name text, workday_id uuid, workday_name text, hours_per_week numeric, range_id uuid, weekday smallint, starts_at time without time zone, ends_at time without time zone, note text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    owner.id,
    owner.nombre,
    owner.apellido,
    owner.equipo_id,
    team.nombre,
    CASE WHEN workday.activo = true THEN workday.id END,
    CASE WHEN workday.activo = true THEN workday.nombre END,
    CASE WHEN workday.activo = true THEN workday.horas_semana END,
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
$function$;

REVOKE ALL ON FUNCTION public.get_visible_weekly_availability() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_visible_weekly_availability() TO authenticated, service_role;
