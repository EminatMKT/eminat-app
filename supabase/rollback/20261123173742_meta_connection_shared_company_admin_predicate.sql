-- Pure refactor, no data involved: restore the original inline predicate bodies,
-- then drop the shared helper this migration added.
BEGIN;
SET LOCAL lock_timeout='5s';

CREATE OR REPLACE FUNCTION public.native_meta_require_company(p_org uuid,p_member uuid,p_company text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' OR NOT EXISTS(
  SELECT 1 FROM public.sales_members m
  JOIN public.usuarios u ON u.id=m.user_id AND u.auth_id=m.auth_id AND u.activo
  JOIN public.sales_organizations o ON o.id=m.organization_id AND o.status='active'
  JOIN public.sales_social_company_bindings b ON b.organization_id=o.id AND b.active
  JOIN public.empresas e ON e.codigo=b.company_code AND e.activo
  JOIN public.usuario_empresas_acceso ca ON ca.usuario_id=u.id AND ca.empresa_codigo=e.codigo
  WHERE m.organization_id=p_org AND m.id=p_member AND m.status='active'
   AND m.role IN ('SUPERADMIN','ADMINISTRATOR') AND b.company_code=p_company
 ) THEN RAISE EXCEPTION 'META_COMPANY_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.native_meta_expire_access() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'SALES_SERVER_ONLY'; END IF;
 UPDATE public.sales_social_oauth_states SET status='FAILED',grant_ciphertext=NULL,pages_ciphertext=NULL
  WHERE status<>'CONSUMED' AND (expires_at<=now() OR NOT EXISTS(
   SELECT 1 FROM public.sales_members m JOIN public.usuarios u ON u.id=m.user_id AND u.auth_id=m.auth_id AND u.activo
   JOIN public.usuario_empresas_acceso ca ON ca.usuario_id=u.id
   JOIN public.sales_social_company_bindings b ON b.organization_id=m.organization_id AND b.company_code=ca.empresa_codigo AND b.active
   JOIN public.empresas e ON e.codigo=b.company_code AND e.activo
   JOIN public.sales_organizations o ON o.id=b.organization_id AND o.status='active'
   WHERE m.id=requester_member_id AND m.organization_id=sales_social_oauth_states.organization_id
    AND m.status='active' AND m.role IN ('ADMINISTRATOR','SUPERADMIN') AND b.company_code=sales_social_oauth_states.company_code));
 DELETE FROM public.sales_social_discovered_assets WHERE state_id IN (
  SELECT id FROM public.sales_social_oauth_states WHERE status IN ('CONSUMED','FAILED'));
 UPDATE public.sales_social_grants g SET status='AUTHORIZER_DEPARTED',token_ciphertext=NULL
  WHERE g.status='ACTIVE' AND NOT EXISTS(
   SELECT 1 FROM public.sales_members m JOIN public.usuarios u ON u.id=m.user_id AND u.auth_id=m.auth_id AND u.activo
   JOIN public.usuario_empresas_acceso ca ON ca.usuario_id=u.id
   JOIN public.sales_social_company_bindings b ON b.organization_id=m.organization_id AND b.company_code=ca.empresa_codigo AND b.active
   JOIN public.empresas e ON e.codigo=b.company_code AND e.activo
   JOIN public.sales_organizations o ON o.id=b.organization_id AND o.status='active'
   WHERE m.id=g.authorizer_member_id AND m.organization_id=g.organization_id AND m.status='active'
    AND m.role IN ('ADMINISTRATOR','SUPERADMIN') AND b.company_code=g.company_code);
 UPDATE public.sales_social_grants SET status='EXPIRED',token_ciphertext=NULL WHERE status='ACTIVE' AND expires_at<=now();
 UPDATE public.sales_social_integrations i SET status='DEGRADED'
  FROM public.sales_social_grants g WHERE g.id=i.grant_id AND g.status IN ('EXPIRED','AUTHORIZER_DEPARTED','REVOKED') AND i.status='CONNECTED';
 UPDATE public.sales_social_assets a SET token_ciphertext=NULL,status='DISABLED',generation=gen_random_uuid()
  FROM public.sales_social_accounts ac JOIN public.sales_social_integrations i ON i.id=ac.integration_id
  WHERE a.account_id=ac.id AND i.status='DEGRADED' AND a.status<>'DISABLED';
END $$;

DROP FUNCTION public.native_meta_active_company_admin(uuid,uuid,text);
COMMIT;
