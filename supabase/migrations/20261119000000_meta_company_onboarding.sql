-- Self-service onboarding never grants company access. Two independent assignments
-- are required: active administrator membership AND explicit operational company access.
BEGIN;
SET LOCAL lock_timeout='5s';
CREATE TABLE public.sales_social_company_binding_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL, company_code text NOT NULL,
 member_id uuid NOT NULL, user_id uuid NOT NULL REFERENCES public.usuarios(id),
 active boolean NOT NULL, relationship text
 CHECK ((NOT active AND relationship IS NULL) OR relationship IN ('OWNER_ASSERTED','AGENCY_DELEGATED')),
 CHECK (NOT active OR relationship IS NOT NULL),
 recorded_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY (organization_id,company_code) REFERENCES public.sales_social_company_bindings(organization_id,company_code),
 FOREIGN KEY (organization_id,member_id) REFERENCES public.sales_members(organization_id,id)
);
CREATE INDEX social_company_events_scope_idx ON public.sales_social_company_binding_events(organization_id,company_code,recorded_at DESC);
ALTER TABLE public.sales_social_company_binding_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sales_social_company_binding_events FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT ON public.sales_social_company_binding_events TO service_role;

CREATE FUNCTION public.native_meta_onboarding_actor(p_org uuid,p_member uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_user uuid;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION 'META_COMPANY_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
 SELECT u.id INTO v_user FROM public.sales_members m
 JOIN public.usuarios u ON u.id=m.user_id AND u.auth_id=m.auth_id AND u.activo
 JOIN public.sales_organizations o ON o.id=m.organization_id AND o.status='active'
 WHERE m.organization_id=p_org AND m.id=p_member AND m.status='active'
 AND m.role IN ('SUPERADMIN','ADMINISTRATOR') FOR SHARE OF m,u,o;
 IF v_user IS NULL THEN RAISE EXCEPTION 'META_COMPANY_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
 RETURN v_user;
END $$;

CREATE FUNCTION public.native_meta_onboarding_companies(p_org uuid,p_member uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_user uuid; v_result jsonb;
BEGIN
 v_user:=public.native_meta_onboarding_actor(p_org,p_member);
 SELECT coalesce(jsonb_agg(jsonb_build_object('code',e.codigo,'name',e.nombre,
  'enabled',coalesce(b.active,false),'relationship',history.relationship) ORDER BY e.nombre,e.codigo),'[]'::jsonb)
 INTO v_result FROM public.usuario_empresas_acceso a
 JOIN public.empresas e ON e.codigo=a.empresa_codigo AND e.activo
 LEFT JOIN public.sales_social_company_bindings b ON b.organization_id=p_org AND b.company_code=e.codigo
 LEFT JOIN LATERAL (SELECT h.relationship FROM public.sales_social_company_binding_events h
  WHERE h.organization_id=p_org AND h.company_code=e.codigo ORDER BY h.recorded_at DESC,h.id DESC LIMIT 1) history ON true
 WHERE a.usuario_id=v_user;
 RETURN v_result;
END $$;

CREATE FUNCTION public.native_meta_manage_company(p_org uuid,p_member uuid,p_company text,p_active boolean,p_relationship text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_user uuid;
BEGIN
 v_user:=public.native_meta_onboarding_actor(p_org,p_member);
 IF p_company IS NULL OR length(p_company) NOT BETWEEN 1 AND 100 OR p_active IS NULL
 OR (p_active AND p_relationship IS NULL) OR (p_relationship IS NOT NULL AND p_relationship NOT IN ('OWNER_ASSERTED','AGENCY_DELEGATED')) THEN
  RAISE EXCEPTION 'META_COMPANY_INVALID' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.usuario_empresas_acceso a JOIN public.empresas e ON e.codigo=a.empresa_codigo
 WHERE a.usuario_id=v_user AND e.codigo=p_company AND e.activo FOR SHARE OF a,e;
 IF NOT FOUND THEN RAISE EXCEPTION 'META_COMPANY_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
 -- Serialize membership changes for one org/company without touching reservations.
 PERFORM pg_advisory_xact_lock(hashtextextended('meta-company:'||p_org::text||':'||p_company,0));
 INSERT INTO public.sales_social_company_bindings(organization_id,company_code,approved_by,evidence_ref,active)
 VALUES(p_org,p_company,v_user,'self-service:'||p_member::text||':'||coalesce(p_relationship,'DISABLE'),p_active)
 ON CONFLICT(organization_id,company_code) DO UPDATE SET active=excluded.active,
  approved_by=excluded.approved_by,approved_at=now(),evidence_ref=excluded.evidence_ref;
 INSERT INTO public.sales_social_company_binding_events(organization_id,company_code,member_id,user_id,active,relationship)
 VALUES(p_org,p_company,p_member,v_user,p_active,p_relationship);
 -- Disabling immediately clears unusable local credentials through the existing
 -- fixed-rule lifecycle. It cannot confirm provider cleanup or release ownership.
 IF NOT p_active THEN PERFORM public.native_meta_expire_access(); END IF;
 RETURN jsonb_build_object('companyCode',p_company,'enabled',p_active,'ingestionEnabled',false);
END $$;

REVOKE ALL ON FUNCTION public.native_meta_onboarding_actor(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.native_meta_onboarding_companies(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.native_meta_manage_company(uuid,uuid,text,boolean,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_meta_onboarding_actor(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.native_meta_onboarding_companies(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.native_meta_manage_company(uuid,uuid,text,boolean,text) TO service_role;
COMMIT;
