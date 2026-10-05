-- Organizational teams remain in equipos; project roles belong only to a membership.
ALTER TABLE public.project_members
  ADD COLUMN project_role text NOT NULL DEFAULT 'Member'
  CONSTRAINT project_members_role_check CHECK (project_role IN ('Project Lead', 'Member', 'Reviewer'));

-- A project role is descriptive; it never grants project administration.
GRANT UPDATE (project_role) ON public.project_members TO authenticated;
CREATE POLICY project_members_update ON public.project_members FOR UPDATE TO authenticated
  USING (public.is_admin() AND public.has_module('tasks'))
  WITH CHECK (public.is_admin() AND public.has_module('tasks'));

COMMENT ON COLUMN public.project_members.project_role IS
  'Operational role in this project, independent of usuarios.rol and equipos.';

-- Team workload is deliberately separate from Dashboard and contains no hours,
-- days, rankings, or historical productivity. The server checks the caller.
CREATE FUNCTION public.lilly_team_workload()
RETURNS TABLE (user_id uuid, pending_count integer, in_progress_count integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.is_admin() OR NOT public.has_module('tasks') THEN
    RAISE EXCEPTION 'Team workload requires admin' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT a.responsable_id,
         count(*) FILTER (WHERE a.estado = 'Pendiente')::integer,
         count(*) FILTER (WHERE a.estado = 'En proceso')::integer
  FROM public.actividades a
  WHERE a.responsable_id IS NOT NULL
  GROUP BY a.responsable_id;
END;
$$;
REVOKE ALL ON FUNCTION public.lilly_team_workload() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lilly_team_workload() FROM anon;
GRANT EXECUTE ON FUNCTION public.lilly_team_workload() TO authenticated;
