-- LILLY Projects: use the existing company catalogue and user identities.
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 160),
  description text NOT NULL DEFAULT '',
  company_code text NOT NULL REFERENCES public.empresas(codigo) ON UPDATE CASCADE,
  status text NOT NULL DEFAULT 'Planning' CHECK (status IN ('Planning', 'Active', 'On Hold', 'Completed', 'Archived')),
  start_date date,
  target_date date,
  created_by uuid NOT NULL REFERENCES public.usuarios(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT projects_dates_order CHECK (target_date IS NULL OR start_date IS NULL OR target_date >= start_date)
);

CREATE INDEX projects_company_status_idx ON public.projects (company_code, status);
CREATE INDEX projects_created_at_idx ON public.projects (created_at DESC);

CREATE TABLE public.project_members (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);
CREATE INDEX project_members_user_idx ON public.project_members (user_id, project_id);
GRANT SELECT, INSERT, UPDATE ON public.projects TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.project_members TO authenticated;

-- Nullable and additive: existing activities keep responsable_id and their current behavior.
ALTER TABLE public.actividades ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
CREATE INDEX actividades_project_idx ON public.actividades (project_id) WHERE project_id IS NOT NULL;

-- SECURITY DEFINER avoids recursive policies on project_members; no caller-supplied identity.
CREATE FUNCTION public.can_access_project(p_project_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT public.has_module('tasks') AND (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.project_members pm
      JOIN public.usuarios u ON u.id = pm.user_id
      WHERE pm.project_id = p_project_id AND u.auth_id = auth.uid()
    )
  );
$$;
REVOKE ALL ON FUNCTION public.can_access_project(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_project(uuid) TO authenticated;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY projects_read ON public.projects FOR SELECT TO authenticated
  USING (public.can_access_project(id));
CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND public.has_module('tasks') AND created_by =
    (SELECT id FROM public.usuarios WHERE auth_id = auth.uid()));
CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated
  USING (public.is_admin() AND public.has_module('tasks'))
  WITH CHECK (public.is_admin() AND public.has_module('tasks'));
CREATE POLICY project_members_read ON public.project_members FOR SELECT TO authenticated
  USING (public.can_access_project(project_id));
CREATE POLICY project_members_insert ON public.project_members FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND public.has_module('tasks'));
CREATE POLICY project_members_delete ON public.project_members FOR DELETE TO authenticated
  USING (public.is_admin() AND public.has_module('tasks'));

-- Any activity/project association must be made by admin and stay in the same brand.
CREATE FUNCTION public.guard_activity_project() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.project_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.project_id IS NOT DISTINCT FROM OLD.project_id
    AND (NEW.project_id IS NULL OR NEW.empresa IS NOT DISTINCT FROM OLD.empresa) THEN RETURN NEW; END IF;
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Only admin can link project tasks'; END IF;
  IF NEW.project_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.projects p WHERE p.id = NEW.project_id AND p.company_code = NEW.empresa
    ) THEN RAISE EXCEPTION 'Task and project company must match'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_activity_project_update BEFORE UPDATE OF project_id, empresa ON public.actividades
FOR EACH ROW EXECUTE FUNCTION public.guard_activity_project();
CREATE TRIGGER guard_activity_project_insert BEFORE INSERT ON public.actividades
FOR EACH ROW EXECUTE FUNCTION public.guard_activity_project();

CREATE FUNCTION public.guard_project_company() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.company_code IS DISTINCT FROM OLD.company_code AND EXISTS (
    SELECT 1 FROM public.actividades a WHERE a.project_id = NEW.id AND a.empresa IS DISTINCT FROM NEW.company_code
  ) THEN RAISE EXCEPTION 'Linked tasks must match project company'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_project_company_update BEFORE UPDATE OF company_code ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.guard_project_company();

-- Aggregate under the caller's RLS. Overview cards never need to transfer every task row.
CREATE VIEW public.project_task_stats WITH (security_invoker = true) AS
SELECT p.id AS project_id,
       count(a.id)::integer AS task_count,
       count(a.id) FILTER (WHERE a.estado = 'Completado')::integer AS completed_count
FROM public.projects p
LEFT JOIN public.actividades a ON a.project_id = p.id
GROUP BY p.id;
GRANT SELECT ON public.project_task_stats TO authenticated;
