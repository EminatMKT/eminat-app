-- ROLLBACK for the five weekly-availability migrations pushed together on 2026-11-09
-- (20261029160000, 20261030001822, 20261102164954, 20261109200921, 20261109223710).
--
-- Valid ONLY if the precheck (supabase/prechecks/20261109_weekly_availability_push.sql) showed
-- `objects_already_exist` ok = true: then every object below was created by this push and
-- dropping it restores prod exactly. If that row was false, STOP — this file would drop
-- something that existed before (possibly stratix-meet's) and needs rewriting first.
--
-- Data loss: user_weekly_availability_ranges holds whatever people declared after the push.
-- Dump it before running this:
--   pnpm supabase db dump --linked --data-only -s public \
--     -f supabase/rollback/predump-weekly-availability-ranges-YYYYMMDD.sql
-- jornadas keeps every pre-existing column and value; only horas_semana is removed.
-- btree_gist is left installed on purpose: other objects may use it and it holds no data.
--
--   pnpm supabase db query --linked -f supabase/rollback/20261109_weekly_availability_push_rollback.sql

BEGIN;

DROP FUNCTION IF EXISTS public.get_visible_weekly_availability();
DROP FUNCTION IF EXISTS public.replace_own_weekly_availability(jsonb);
DROP FUNCTION IF EXISTS public.current_user_has_active_jornada(uuid);

-- Drops its four task_availability_* policies, index and constraints with it.
DROP TABLE IF EXISTS public.user_weekly_availability_ranges;

DROP FUNCTION IF EXISTS public.can_read_weekly_availability(uuid);
DROP FUNCTION IF EXISTS public.current_active_tasks_user_id();

ALTER TABLE public.jornadas DROP CONSTRAINT IF EXISTS jornadas_horas_semana_check;
ALTER TABLE public.jornadas DROP COLUMN IF EXISTS horas_semana;

DELETE FROM supabase_migrations.schema_migrations
WHERE version IN ('20261029160000', '20261030001822', '20261102164954',
                  '20261109200921', '20261109223710');

COMMIT;
