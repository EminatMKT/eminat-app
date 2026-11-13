-- POST-PUSH verification for the five weekly-availability migrations (2026-11-09).
-- READ-ONLY. Every row must show ok = true.
--   pnpm supabase db query --linked -o table -f supabase/checks/verificar-weekly-availability-push.sql

WITH new_functions AS (
  SELECT oid, proname
  FROM pg_proc
  WHERE pronamespace = 'public'::regnamespace
    AND proname IN ('current_active_tasks_user_id', 'can_read_weekly_availability',
                    'get_visible_weekly_availability', 'replace_own_weekly_availability',
                    'current_user_has_active_jornada')
)
SELECT 'migrations_recorded' AS check_name,
       count(*) = 5 AS ok,
       string_agg(version, ', ' ORDER BY version) AS detail
FROM supabase_migrations.schema_migrations
WHERE version IN ('20261029160000', '20261030001822', '20261102164954',
                  '20261109200921', '20261109223710')

UNION ALL

SELECT 'ranges_table_with_rls', bool_and(relrowsecurity), string_agg(relname, ', ')
FROM pg_class
WHERE relnamespace = 'public'::regnamespace AND relname = 'user_weekly_availability_ranges'

UNION ALL

SELECT 'ranges_policies', count(*) = 4, string_agg(policyname, ', ')
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_weekly_availability_ranges'

UNION ALL

SELECT 'functions_present', count(*) = 5, string_agg(proname, ', ')
FROM new_functions

UNION ALL

-- anon must not reach any of them.
SELECT 'no_anon_execute', count(*) = 0, string_agg(proname, ', ')
FROM new_functions
WHERE has_function_privilege('anon', oid, 'EXECUTE')

UNION ALL

SELECT 'jornadas_weekly_hours_backfilled', bool_and(horas_semana = horas_dia * 5),
       string_agg(codigo || '=' || horas_semana, ', ')
FROM public.jornadas;
