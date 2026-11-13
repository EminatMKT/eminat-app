-- PRECHECK for the five weekly-availability migrations pushed together on 2026-11-09:
--   20261029160000_task_weekly_availability.sql
--   20261030001822_fix_admin_own_weekly_availability.sql
--   20261102164954_widen_weekly_availability_org_wide.sql
--   20261109200921_require_jornada_for_weekly_availability.sql
--   20261109223710_jornadas_weekly_hours.sql
--
-- READ-ONLY. Run against prod BEFORE `db push`, after the backup:
--   pnpm supabase db query --linked -o table -f supabase/prechecks/20261109_weekly_availability_push.sql
--
-- Every row below is a way the push aborts halfway or, worse, silently overwrites something.
-- Expected result: every `problem` row shows ok = true.

-- 1. Nothing with these names exists yet. CREATE TABLE would abort; CREATE OR REPLACE FUNCTION
--    would SILENTLY overwrite a same-named function (prod's schema is shared with stratix-meet).
SELECT 'objects_already_exist' AS problem,
       count(*) = 0 AS ok,
       string_agg(name, ', ') AS detail
FROM (
  SELECT 'table ' || relname AS name FROM pg_class
  WHERE relnamespace = 'public'::regnamespace AND relname = 'user_weekly_availability_ranges'
  UNION ALL
  SELECT 'function ' || proname FROM pg_proc
  WHERE pronamespace = 'public'::regnamespace
    AND proname IN ('current_active_tasks_user_id', 'can_read_weekly_availability',
                    'get_visible_weekly_availability', 'replace_own_weekly_availability',
                    'current_user_has_active_jornada')
  UNION ALL
  SELECT 'column jornadas.horas_semana' FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'jornadas' AND column_name = 'horas_semana'
) existing

UNION ALL

-- 2. Every migration's DO block aborts with RAISE EXCEPTION if the `tasks` module has no grants.
SELECT 'tasks_module_missing', count(*) > 0, count(*) || ' role_modules rows for tasks'
FROM public.role_modules WHERE module_slug = 'tasks'

UNION ALL

-- 3. 20261109223710 backfills horas_semana = horas_dia * 5, then SET NOT NULL and
--    CHECK (> 0 AND <= 168). One null, zero or > 33.6 horas_dia aborts that migration.
SELECT 'jornadas_backfill_would_violate', count(*) = 0,
       string_agg(codigo || '=' || coalesce(horas_dia::text, 'NULL'), ', ')
FROM public.jornadas
WHERE horas_dia IS NULL OR horas_dia * 5 <= 0 OR horas_dia * 5 > 168

UNION ALL

-- 4. The table's exclusion constraint needs btree_gist (created IF NOT EXISTS in `extensions`).
SELECT 'btree_gist_unavailable', count(*) > 0, string_agg(name || ' ' || default_version, ', ')
FROM pg_available_extensions WHERE name = 'btree_gist'

UNION ALL

-- 5. Functions and columns the new code calls must already exist.
SELECT 'dependency_functions_missing', count(*) = 2, string_agg(proname, ', ')
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace AND proname IN ('has_module', 'is_admin')

UNION ALL

SELECT 'dependency_columns_missing', count(*) = 7,
       string_agg(table_name || '.' || column_name, ', ')
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (table_name, column_name) IN (
    ('usuarios', 'auth_id'), ('usuarios', 'activo'), ('usuarios', 'equipo_id'),
    ('usuarios', 'jornada_id'), ('usuarios', 'rol'), ('jornadas', 'activo'),
    ('jornadas', 'horas_dia')
  );
