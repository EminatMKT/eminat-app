-- Phase B installs policies while enforcement remains OFF. The only switch is
-- activate_lilly_access_control(), after reviewed grants and preflight.
-- Deactivated admins cannot exercise database or service-role access.
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM public.usuarios u
    WHERE u.auth_id = auth.uid() AND u.rol = 'admin' AND u.activo = true);
$$;

CREATE FUNCTION public.lilly_can_edit_activity(p_activity uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1 FROM public.actividades a
    WHERE a.id = p_activity AND public.lilly_has_company(a.empresa)
  );
$$;
REVOKE ALL ON FUNCTION public.lilly_can_edit_activity(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lilly_can_edit_activity(uuid) TO authenticated;

-- Existing project access is membership-only. Company grants add all projects
-- in that company; a direct membership adds only that project.
CREATE OR REPLACE FUNCTION public.can_access_project(p_project_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT public.has_module('tasks') AND (
    public.is_admin() OR public.lilly_project_member(p_project_id)
    OR (public.lilly_access_enforced() AND EXISTS (
      SELECT 1 FROM public.projects p WHERE p.id = p_project_id
        AND public.lilly_has_company(p.company_code)
    ))
  );
$$;
REVOKE ALL ON FUNCTION public.can_access_project(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_project(uuid) TO authenticated;

-- Drop every old policy of the targeted command so permissive OR composition
-- cannot silently retain a global route. Other commands are left intact below.
DO $$ DECLARE r record;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND cmd IN ('SELECT', 'ALL')
      AND tablename IN ('actividades','usuarios','empresas','equipos',
        'departamentos','cargos','usuario_cargos','actividad_responsables',
        'projects','project_members')
  LOOP EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename); END LOOP;
END $$;

-- ALL policies on actividades included write permissions. Replace them below.
DROP POLICY IF EXISTS actividades_insert_modulo ON public.actividades;
DROP POLICY IF EXISTS actividades_update_modulo ON public.actividades;
DROP POLICY IF EXISTS actividades_delete_modulo ON public.actividades;
DROP POLICY IF EXISTS actividad_responsables_insert_modulo ON public.actividad_responsables;
DROP POLICY IF EXISTS actividad_responsables_update_modulo ON public.actividad_responsables;
DROP POLICY IF EXISTS actividad_responsables_delete_modulo ON public.actividad_responsables;

CREATE POLICY lilly_activities_read ON public.actividades FOR SELECT TO authenticated
  USING ((public.has_module('tasks') OR public.has_module('stratix-mkt'))
    AND (NOT public.lilly_access_enforced()
      OR public.lilly_can_see_activity(empresa, project_id)));
CREATE POLICY lilly_activities_insert ON public.actividades FOR INSERT TO authenticated
  WITH CHECK ((public.has_module('tasks') OR public.has_module('stratix-mkt'))
    AND (NOT public.lilly_access_enforced() OR public.lilly_has_company(empresa)));
CREATE POLICY lilly_activities_update ON public.actividades FOR UPDATE TO authenticated
  USING ((public.has_module('tasks') OR public.has_module('stratix-mkt'))
    AND (NOT public.lilly_access_enforced() OR public.lilly_has_company(empresa)))
  WITH CHECK ((public.has_module('tasks') OR public.has_module('stratix-mkt'))
    AND (NOT public.lilly_access_enforced() OR public.lilly_has_company(empresa)));
CREATE POLICY lilly_activities_delete ON public.actividades FOR DELETE TO authenticated
  USING ((public.has_module('tasks') OR public.has_module('stratix-mkt'))
    AND (NOT public.lilly_access_enforced() OR public.lilly_has_company(empresa)));

CREATE POLICY lilly_users_read ON public.usuarios FOR SELECT TO authenticated
  USING (public.es_personal() AND
    (NOT public.lilly_access_enforced() OR public.lilly_can_see_user(id)));
-- Keep the existing own-row UPDATE policy; it also powers presence and login.
CREATE POLICY lilly_companies_read ON public.empresas FOR SELECT TO authenticated
  USING (public.es_personal() AND (NOT public.lilly_access_enforced() OR public.lilly_has_company(codigo)
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.company_code = empresas.codigo
      AND public.lilly_project_member(p.id))));
CREATE POLICY lilly_teams_read ON public.equipos FOR SELECT TO authenticated
  USING (public.es_personal() AND (NOT public.lilly_access_enforced() OR public.is_admin()
    OR EXISTS (SELECT 1 FROM public.usuarios u WHERE u.equipo_id = equipos.id
      AND public.lilly_can_see_user(u.id))));
CREATE POLICY lilly_departments_read ON public.departamentos FOR SELECT TO authenticated
  USING (public.es_personal() AND (NOT public.lilly_access_enforced() OR public.is_admin()
    OR EXISTS (SELECT 1 FROM public.equipos e WHERE e.departamento_id = departamentos.id)));
CREATE POLICY lilly_roles_read ON public.cargos FOR SELECT TO authenticated
  USING (public.es_personal() AND (NOT public.lilly_access_enforced() OR public.is_admin()
    OR EXISTS (SELECT 1 FROM public.usuario_cargos uc WHERE uc.cargo_id = cargos.id)));
CREATE POLICY lilly_user_roles_read ON public.usuario_cargos FOR SELECT TO authenticated
  USING (public.es_personal() AND
    (NOT public.lilly_access_enforced() OR public.lilly_can_see_user(usuario_id)));

CREATE POLICY lilly_assignments_read ON public.actividad_responsables FOR SELECT TO authenticated
  USING ((public.has_module('tasks') OR public.has_module('stratix-mkt'))
    AND EXISTS (SELECT 1 FROM public.usuarios actor WHERE actor.auth_id = auth.uid() AND actor.activo)
    AND EXISTS (SELECT 1 FROM public.actividades a WHERE a.id = actividad_id));
CREATE POLICY lilly_assignments_insert ON public.actividad_responsables FOR INSERT TO authenticated
  WITH CHECK ((public.has_module('tasks') OR public.has_module('stratix-mkt'))
    AND EXISTS (SELECT 1 FROM public.usuarios actor WHERE actor.auth_id = auth.uid() AND actor.activo)
    AND (NOT public.lilly_access_enforced() OR public.lilly_can_edit_activity(actividad_id)));
CREATE POLICY lilly_assignments_update ON public.actividad_responsables FOR UPDATE TO authenticated
  USING ((public.has_module('tasks') OR public.has_module('stratix-mkt'))
    AND (NOT public.lilly_access_enforced() OR public.lilly_can_edit_activity(actividad_id)))
  WITH CHECK ((public.has_module('tasks') OR public.has_module('stratix-mkt'))
    AND (NOT public.lilly_access_enforced() OR public.lilly_can_edit_activity(actividad_id)));
CREATE POLICY lilly_assignments_delete ON public.actividad_responsables FOR DELETE TO authenticated
  USING ((public.has_module('tasks') OR public.has_module('stratix-mkt'))
    AND (NOT public.lilly_access_enforced() OR public.lilly_can_edit_activity(actividad_id)));

CREATE POLICY lilly_projects_read ON public.projects FOR SELECT TO authenticated
  USING (public.can_access_project(id));
CREATE POLICY lilly_project_members_read ON public.project_members FOR SELECT TO authenticated
  USING (public.can_access_project(project_id));

-- Legacy aggregate is owner-executed and bypasses actividades RLS. No current
-- application call site uses it; the admin-only metrics RPC replaces it.
REVOKE ALL ON public.v_kpis_globales FROM anon, authenticated;
GRANT SELECT ON public.v_kpis_globales TO service_role;
REVOKE ALL ON public.v_produccion_responsable FROM anon, authenticated;
GRANT SELECT ON public.v_produccion_responsable TO service_role;

-- An assignment to another company requires explicit project membership.
-- Trigger execution is privileged only to inspect access rows, never to grant it.
CREATE FUNCTION public.lilly_guard_assignment_scope() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE task_company text; task_project uuid;
BEGIN
  IF NOT public.lilly_access_enforced() THEN RETURN NEW; END IF;
  SELECT empresa, project_id INTO task_company, task_project
    FROM public.actividades WHERE id = NEW.actividad_id;
  IF NOT EXISTS (SELECT 1 FROM public.usuario_empresas_acceso x
      WHERE x.usuario_id = NEW.usuario_id AND x.empresa_codigo = task_company)
    AND NOT EXISTS (SELECT 1 FROM public.project_members m
      WHERE m.user_id = NEW.usuario_id AND m.project_id = task_project) THEN
    RAISE EXCEPTION 'Assignee needs company scope or project membership'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.lilly_guard_assignment_scope() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER lilly_guard_assignment_scope BEFORE INSERT OR UPDATE OF usuario_id, actividad_id
  ON public.actividad_responsables FOR EACH ROW
  EXECUTE FUNCTION public.lilly_guard_assignment_scope();
