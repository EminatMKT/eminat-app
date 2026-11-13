-- Admin has no role_modules rows by design (short-circuit in app code), so the
-- owner-side role_modules check in can_read_weekly_availability() always failed for
-- an admin's own row, hiding it from their own availability list. Widen the owner
-- check with the same 'admin' literal is_admin() uses in
-- 20261005090100_lilly_access_policies.sql.

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
    WHERE (
      owner.rol = 'admin'
      OR EXISTS (
        SELECT 1
        FROM public.role_modules rm
        WHERE rm.role_key = owner.rol
          AND rm.module_slug = 'tasks'
      )
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
