-- Reads for weekly availability become org-wide among anyone with the `tasks` module --
-- same-team was a Delivery 1 decision this session's product owner explicitly reversed.
-- Self-write-only is unchanged; only can_read_weekly_availability()'s read predicate narrows.

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

CREATE OR REPLACE FUNCTION public.can_read_weekly_availability(p_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH caller AS (
    SELECT u.id
    FROM public.usuarios u
    WHERE u.auth_id = auth.uid()
      AND u.activo = true
      AND public.has_module('tasks')
    LIMIT 1
  ), owner AS (
    SELECT u.id, u.activo, u.rol
    FROM public.usuarios u
    WHERE u.id = p_owner_id
  )
  SELECT EXISTS (
    SELECT 1
    FROM caller
    JOIN owner ON owner.activo = true
    WHERE owner.rol = 'admin'
       OR EXISTS (
         SELECT 1
         FROM public.role_modules rm
         WHERE rm.role_key = owner.rol
           AND rm.module_slug = 'tasks'
       )
  )
$$;
