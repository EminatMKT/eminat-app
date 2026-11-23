-- PR #209 review, finding #8: "active org admin with active company binding" was
-- reimplemented four times (native_meta_require_company, and twice inline inside
-- native_meta_expire_access) with small variations. Extract one shared predicate;
-- behavior is unchanged, only the duplication is removed. No new access is granted.
BEGIN;
SET LOCAL lock_timeout='5s';

-- STABLE: matches the single-statement-snapshot semantics the inline subqueries it
-- replaces always had (PR #209 review verification pass).
CREATE FUNCTION public.native_meta_active_company_admin(p_org uuid,p_member uuid,p_company text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 RETURN EXISTS(
  SELECT 1 FROM public.sales_members m
  JOIN public.usuarios u ON u.id=m.user_id AND u.auth_id=m.auth_id AND u.activo
  JOIN public.sales_organizations o ON o.id=m.organization_id AND o.status='active'
  JOIN public.sales_social_company_bindings b ON b.organization_id=o.id AND b.active AND b.company_code=p_company
  JOIN public.empresas e ON e.codigo=b.company_code AND e.activo
  JOIN public.usuario_empresas_acceso ca ON ca.usuario_id=u.id AND ca.empresa_codigo=e.codigo
  WHERE m.organization_id=p_org AND m.id=p_member AND m.status='active'
   AND m.role IN ('SUPERADMIN','ADMINISTRATOR'));
END $$;

CREATE OR REPLACE FUNCTION public.native_meta_require_company(p_org uuid,p_member uuid,p_company text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' OR NOT public.native_meta_active_company_admin(p_org,p_member,p_company) THEN
  RAISE EXCEPTION 'META_COMPANY_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.native_meta_expire_access() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'SALES_SERVER_ONLY'; END IF;
 UPDATE public.sales_social_oauth_states SET status='FAILED',grant_ciphertext=NULL,pages_ciphertext=NULL
  WHERE status<>'CONSUMED' AND (expires_at<=now()
   OR NOT public.native_meta_active_company_admin(sales_social_oauth_states.organization_id,requester_member_id,sales_social_oauth_states.company_code));
 DELETE FROM public.sales_social_discovered_assets WHERE state_id IN (
  SELECT id FROM public.sales_social_oauth_states WHERE status IN ('CONSUMED','FAILED'));
 UPDATE public.sales_social_grants g SET status='AUTHORIZER_DEPARTED',token_ciphertext=NULL
  WHERE g.status='ACTIVE' AND NOT public.native_meta_active_company_admin(g.organization_id,g.authorizer_member_id,g.company_code);
 UPDATE public.sales_social_grants SET status='EXPIRED',token_ciphertext=NULL WHERE status='ACTIVE' AND expires_at<=now();
 UPDATE public.sales_social_integrations i SET status='DEGRADED'
  FROM public.sales_social_grants g WHERE g.id=i.grant_id AND g.status IN ('EXPIRED','AUTHORIZER_DEPARTED','REVOKED') AND i.status='CONNECTED';
 UPDATE public.sales_social_assets a SET token_ciphertext=NULL,status='DISABLED',generation=gen_random_uuid()
  FROM public.sales_social_accounts ac JOIN public.sales_social_integrations i ON i.id=ac.integration_id
  WHERE a.account_id=ac.id AND i.status='DEGRADED' AND a.status<>'DISABLED';
END $$;

REVOKE ALL ON FUNCTION public.native_meta_active_company_admin(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_meta_active_company_admin(uuid,uuid,text) TO service_role;
COMMIT;
