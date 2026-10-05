-- Progressive rollout: an active user's first explicit company grant enables
-- scope enforcement for that user. Everyone else keeps the previous behavior.
-- The global switch remains the final, separately gated cutover.
CREATE OR REPLACE FUNCTION public.lilly_access_enforced() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT coalesce((SELECT enforced FROM public.lilly_access_control WHERE singleton), false)
    OR EXISTS (
      SELECT 1 FROM public.usuario_empresas_acceso x
      JOIN public.usuarios u ON u.id = x.usuario_id
      WHERE u.auth_id = auth.uid() AND u.activo = true
    );
$$;

-- Company-less historical Tasks stay readable until the final cutover. They
-- cannot be used to discover other company data or create new null-company Tasks.
CREATE OR REPLACE FUNCTION public.lilly_can_see_activity(p_company text, p_project uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT public.is_admin()
    OR (p_company IS NULL AND NOT coalesce(
      (SELECT enforced FROM public.lilly_access_control WHERE singleton), false))
    OR public.lilly_has_company(p_company)
    OR (p_project IS NOT NULL AND public.lilly_project_member(p_project));
$$;

-- Assignment access follows the recipient's rollout state, not the actor's.
-- An unconfigured recipient retains legacy assignment behavior. This trigger
-- does not change notification delivery or grant a company scope.
CREATE OR REPLACE FUNCTION public.lilly_guard_assignment_scope() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE task_company text; task_project uuid; strict_mode boolean;
BEGIN
  SELECT enforced INTO strict_mode FROM public.lilly_access_control WHERE singleton;
  IF NOT strict_mode AND NOT EXISTS (
    SELECT 1 FROM public.usuario_empresas_acceso x WHERE x.usuario_id = NEW.usuario_id
  ) THEN RETURN NEW; END IF;

  SELECT empresa, project_id INTO task_company, task_project
    FROM public.actividades WHERE id = NEW.actividad_id;
  IF task_company IS NULL AND NOT strict_mode THEN RETURN NEW; END IF;
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
