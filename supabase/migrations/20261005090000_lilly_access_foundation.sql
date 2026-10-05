-- Phase A: additive access assignments. No existing visibility changes here.
-- `empresas.codigo` is the operational brand key used by actividades.empresa and
-- projects.company_code. usuarios.empresa_id remains organizational affiliation.
CREATE TABLE public.usuario_empresas_acceso (
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  empresa_codigo text NOT NULL REFERENCES public.empresas(codigo) ON UPDATE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  PRIMARY KEY (usuario_id, empresa_codigo)
);
CREATE INDEX usuario_empresas_acceso_empresa_idx
  ON public.usuario_empresas_acceso (empresa_codigo, usuario_id);
ALTER TABLE public.usuario_empresas_acceso ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.usuario_empresas_acceso FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.usuario_empresas_acceso TO authenticated;
GRANT ALL ON public.usuario_empresas_acceso TO service_role;
CREATE POLICY usuario_empresas_acceso_read ON public.usuario_empresas_acceso
  FOR SELECT TO authenticated USING (
    public.is_admin() OR usuario_id = (
      SELECT id FROM public.usuarios WHERE auth_id = auth.uid()
    )
  );

CREATE TABLE public.lilly_access_control (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  enforced boolean NOT NULL DEFAULT false,
  activated_at timestamptz,
  activated_by uuid REFERENCES public.usuarios(id)
);
INSERT INTO public.lilly_access_control (singleton, enforced) VALUES (true, false);
ALTER TABLE public.lilly_access_control ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lilly_access_control FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.lilly_access_control TO service_role;

-- Used by RLS. The caller supplies no user identity; it always comes from auth.uid().
CREATE FUNCTION public.lilly_access_enforced() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT enforced FROM public.lilly_access_control WHERE singleton;
$$;
CREATE FUNCTION public.lilly_has_company(p_code text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1 FROM public.usuario_empresas_acceso x
    JOIN public.usuarios u ON u.id = x.usuario_id
    WHERE u.auth_id = auth.uid() AND u.activo = true
      AND x.empresa_codigo = p_code
  );
$$;
CREATE FUNCTION public.lilly_project_member(p_project_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members m
    JOIN public.usuarios u ON u.id = m.user_id
    WHERE m.project_id = p_project_id AND u.auth_id = auth.uid() AND u.activo = true
  );
$$;
CREATE FUNCTION public.lilly_can_see_activity(p_company text, p_project uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT public.is_admin() OR public.lilly_has_company(p_company)
    OR (p_project IS NOT NULL AND public.lilly_project_member(p_project));
$$;
CREATE FUNCTION public.lilly_can_see_user(p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1 FROM public.usuarios actor WHERE actor.auth_id = auth.uid()
      AND actor.id = p_user
  ) OR EXISTS (
    SELECT 1 FROM public.usuario_empresas_acceso own_scope
    JOIN public.usuarios actor ON actor.id = own_scope.usuario_id
    JOIN public.usuario_empresas_acceso peer_scope
      ON peer_scope.empresa_codigo = own_scope.empresa_codigo
    WHERE actor.auth_id = auth.uid() AND actor.activo = true
      AND peer_scope.usuario_id = p_user
  ) OR EXISTS (
    SELECT 1 FROM public.project_members mine
    JOIN public.usuarios actor ON actor.id = mine.user_id
    JOIN public.project_members peer ON peer.project_id = mine.project_id
    WHERE actor.auth_id = auth.uid() AND actor.activo = true
      AND peer.user_id = p_user
  ) OR EXISTS (
    SELECT 1 FROM public.actividad_responsables ar
    JOIN public.actividades a ON a.id = ar.actividad_id
    WHERE ar.usuario_id = p_user
      AND (public.lilly_has_company(a.empresa)
        OR (a.project_id IS NOT NULL AND public.lilly_project_member(a.project_id)))
  );
$$;
REVOKE ALL ON FUNCTION public.lilly_access_enforced() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lilly_has_company(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lilly_project_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lilly_can_see_activity(text,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lilly_can_see_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lilly_access_enforced() TO authenticated;
GRANT EXECUTE ON FUNCTION public.lilly_has_company(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lilly_project_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lilly_can_see_activity(text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lilly_can_see_user(uuid) TO authenticated;

-- Read-only audit: run in Preview before considering activation. It never grants access.
CREATE VIEW public.lilly_access_preflight WITH (security_invoker = false) AS
SELECT
  (SELECT count(*) FROM public.usuarios u WHERE u.activo AND u.rol <> 'admin'
    AND NOT EXISTS (SELECT 1 FROM public.usuario_empresas_acceso x WHERE x.usuario_id = u.id)) AS active_without_scope,
  (SELECT count(DISTINCT usuario_id) FROM public.usuario_empresas_acceso) AS users_with_scope,
  (SELECT count(*) FROM public.actividades a WHERE a.empresa IS NULL
    OR NOT EXISTS (SELECT 1 FROM public.empresas e WHERE e.codigo = a.empresa)) AS tasks_without_company,
  (SELECT count(*) FROM public.projects p WHERE p.company_code IS NULL
    OR NOT EXISTS (SELECT 1 FROM public.empresas e WHERE e.codigo = p.company_code)) AS projects_without_company,
  (SELECT count(*) FROM public.actividades a WHERE a.project_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = a.project_id
      AND p.company_code = a.empresa)) AS mismatched_project_tasks,
  (SELECT count(*) FROM public.actividad_responsables ar
    JOIN public.actividades a ON a.id = ar.actividad_id
    WHERE NOT EXISTS (SELECT 1 FROM public.usuario_empresas_acceso x
      WHERE x.usuario_id = ar.usuario_id AND x.empresa_codigo = a.empresa)
      AND NOT EXISTS (SELECT 1 FROM public.project_members m
        WHERE m.user_id = ar.usuario_id AND m.project_id = a.project_id)
  ) AS assignments_without_access;
REVOKE ALL ON public.lilly_access_preflight FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.lilly_access_preflight TO service_role;

-- Separate, deliberate activation after reviewed assignments and isolation tests.
CREATE FUNCTION public.activate_lilly_access_control() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE audit record;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service_role required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO audit FROM public.lilly_access_preflight;
  IF audit.active_without_scope <> 0 OR audit.tasks_without_company <> 0
    OR audit.projects_without_company <> 0 OR audit.mismatched_project_tasks <> 0 THEN
    RAISE EXCEPTION 'Access preflight failed: %', to_jsonb(audit)
      USING ERRCODE = '23514';
  END IF;
  -- Keep the preflight invariant true for future admin-created Tasks, too.
  ALTER TABLE public.actividades ALTER COLUMN empresa SET NOT NULL;
  UPDATE public.lilly_access_control SET enforced = true, activated_at = now(),
    activated_by = (SELECT id FROM public.usuarios WHERE auth_id = auth.uid())
    WHERE singleton;
END;
$$;
REVOKE ALL ON FUNCTION public.activate_lilly_access_control() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_lilly_access_control() TO service_role;

-- Atomic administrative replacement, independent of user profile edits.
CREATE FUNCTION public.replace_lilly_user_companies(
  p_user uuid, p_codes text[], p_actor uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE codes text[];
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service_role required' USING ERRCODE = '42501';
  END IF;
  PERFORM 1 FROM public.usuarios WHERE id = p_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown user' USING ERRCODE = '22023'; END IF;
  SELECT coalesce(array_agg(DISTINCT code ORDER BY code), ARRAY[]::text[])
    INTO codes FROM unnest(coalesce(p_codes, ARRAY[]::text[])) AS code;
  IF EXISTS (SELECT 1 FROM unnest(codes) AS code
    WHERE NOT EXISTS (SELECT 1 FROM public.empresas e WHERE e.codigo = code)) THEN
    RAISE EXCEPTION 'Unknown company code' USING ERRCODE = '22023';
  END IF;
  DELETE FROM public.usuario_empresas_acceso WHERE usuario_id = p_user
    AND empresa_codigo <> ALL(codes);
  INSERT INTO public.usuario_empresas_acceso(usuario_id, empresa_codigo, created_by)
    SELECT p_user, code, p_actor FROM unnest(codes) AS code
    ON CONFLICT (usuario_id, empresa_codigo) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.replace_lilly_user_companies(uuid,text[],uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_lilly_user_companies(uuid,text[],uuid)
  TO service_role;
