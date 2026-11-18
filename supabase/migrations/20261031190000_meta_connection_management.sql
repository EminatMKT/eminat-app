-- Phase 1 only. No company mappings, credentials, provider enablement or subscriptions seeded.
-- Reviewed mappings require an explicit operator decision; matching codes never establish ownership.
BEGIN;
SET LOCAL lock_timeout='5s';
CREATE TABLE public.sales_social_company_bindings (
 organization_id uuid NOT NULL REFERENCES public.sales_organizations(id),
 company_code text NOT NULL REFERENCES public.empresas(codigo),
 approved_by uuid NOT NULL REFERENCES public.usuarios(id),
 approved_at timestamptz NOT NULL DEFAULT now(), evidence_ref text NOT NULL CHECK(length(btrim(evidence_ref))>0),
 active boolean NOT NULL DEFAULT true, PRIMARY KEY(organization_id,company_code)
);
ALTER TABLE public.sales_social_oauth_states
 ADD COLUMN company_code text,
 ADD COLUMN return_path text,
 ADD COLUMN reconnect_integration_id uuid,
 ADD COLUMN meta_user_id text,
 ADD COLUMN app_id text;
ALTER TABLE public.sales_social_oauth_states ADD CONSTRAINT social_state_company_fk
 FOREIGN KEY(organization_id,company_code) REFERENCES public.sales_social_company_bindings(organization_id,company_code);
ALTER TABLE public.sales_social_oauth_states DROP CONSTRAINT sales_social_oauth_states_status_check;
ALTER TABLE public.sales_social_oauth_states ADD CONSTRAINT sales_social_oauth_states_status_check
 CHECK(status IN ('PENDING','EXCHANGING','EXCHANGED','CONSUMED','FAILED'));
CREATE TABLE public.sales_social_grants (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL, company_code text NOT NULL,
 authorizer_member_id uuid NOT NULL, meta_user_id text NOT NULL, app_id text NOT NULL,
 token_ciphertext text, expires_at timestamptz NOT NULL, permissions jsonb NOT NULL,
 status text NOT NULL CHECK(status IN ('ACTIVE','EXPIRED','REVOKED','AUTHORIZER_DEPARTED','LOCAL_DISABLED')),
 authorized_at timestamptz NOT NULL DEFAULT now(), checked_at timestamptz,
 health_error text CHECK(health_error IN ('PROVIDER_UNAVAILABLE','ACCESS_REVOKED','PERMISSION_MISSING','ASSET_ACCESS_REMOVED')),
 FOREIGN KEY(organization_id,company_code) REFERENCES public.sales_social_company_bindings(organization_id,company_code),
 FOREIGN KEY(organization_id,authorizer_member_id) REFERENCES public.sales_members(organization_id,id),
 UNIQUE(organization_id,id), UNIQUE(organization_id,company_code,id)
);
ALTER TABLE public.sales_social_integrations
 ADD COLUMN company_code text,
 ADD COLUMN grant_id uuid,
 ADD COLUMN provider_cleanup text NOT NULL DEFAULT 'NOT_REQUESTED'
 CHECK(provider_cleanup IN ('NOT_REQUESTED','PENDING','FAILED','CONFIRMED')),
 ADD COLUMN provider_cleanup_error text CHECK(provider_cleanup_error IN ('PROVIDER_UNAVAILABLE','PERMISSION_DENIED','REAUTH_REQUIRED'));
ALTER TABLE public.sales_social_integrations ADD CONSTRAINT social_integration_company_fk
 FOREIGN KEY(organization_id,company_code) REFERENCES public.sales_social_company_bindings(organization_id,company_code);
ALTER TABLE public.sales_social_integrations ADD CONSTRAINT social_integration_grant_fk
 FOREIGN KEY(organization_id,company_code,grant_id) REFERENCES public.sales_social_grants(organization_id,company_code,id);
ALTER TABLE public.sales_social_integrations ADD CONSTRAINT social_connection_company_unique UNIQUE(organization_id,company_code,id);
ALTER TABLE public.sales_social_oauth_states ADD CONSTRAINT social_state_reconnect_fk
 FOREIGN KEY(organization_id,company_code,reconnect_integration_id) REFERENCES public.sales_social_integrations(organization_id,company_code,id);
CREATE TABLE public.sales_social_discovered_assets (
 id uuid PRIMARY KEY, state_id uuid NOT NULL REFERENCES public.sales_social_oauth_states(id) ON DELETE CASCADE,
 organization_id uuid NOT NULL, external_id text NOT NULL CHECK(length(external_id) BETWEEN 1 AND 200),
 asset_type text NOT NULL CHECK(asset_type IN ('page','instagram')),
 display_name text NOT NULL CHECK(length(display_name) BETWEEN 1 AND 500), parent_external_id text, reported_business_id text,
 reported_business_name text, tasks jsonb NOT NULL CHECK(jsonb_typeof(tasks)='array'),
 token_ciphertext text NOT NULL CHECK(length(token_ciphertext) BETWEEN 1 AND 32768),
 FOREIGN KEY(organization_id,state_id) REFERENCES public.sales_social_oauth_states(organization_id,id),
 UNIQUE(state_id,external_id)
);
ALTER TABLE public.sales_social_assets
 ADD COLUMN company_code text,
 ADD COLUMN generation uuid NOT NULL DEFAULT gen_random_uuid(),
 ADD COLUMN reported_business_id text,
 ADD COLUMN relationship text CHECK(relationship IN ('OWNER_ASSERTED','AGENCY_DELEGATED'));
ALTER TABLE public.sales_social_assets ADD CONSTRAINT social_asset_company_fk
 FOREIGN KEY(organization_id,company_code) REFERENCES public.sales_social_company_bindings(organization_id,company_code);
ALTER TABLE public.sales_social_accounts ADD COLUMN company_code text;
ALTER TABLE public.sales_social_accounts ADD CONSTRAINT social_account_company_unique UNIQUE(organization_id,company_code,id);
ALTER TABLE public.sales_social_accounts ADD CONSTRAINT social_account_company_connection_fk
 FOREIGN KEY(organization_id,company_code,integration_id) REFERENCES public.sales_social_integrations(organization_id,company_code,id);
ALTER TABLE public.sales_social_assets ADD CONSTRAINT social_asset_company_unique UNIQUE(organization_id,company_code,id);
ALTER TABLE public.sales_social_assets ADD CONSTRAINT social_asset_company_account_fk
 FOREIGN KEY(organization_id,company_code,account_id) REFERENCES public.sales_social_accounts(organization_id,company_code,id);
-- Reservations survive local disablement. Cross-company/tenant transfers require separately
-- reviewed provider cleanup and a future transfer procedure, never automatic reassignment.
CREATE TABLE public.sales_social_asset_ownership (
 external_id text PRIMARY KEY, organization_id uuid NOT NULL, company_code text NOT NULL,
 asset_id uuid NOT NULL, reserved_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(organization_id,company_code,asset_id) REFERENCES public.sales_social_assets(organization_id,company_code,id),
 FOREIGN KEY(organization_id,company_code) REFERENCES public.sales_social_company_bindings(organization_id,company_code)
);
-- Do not silently reinterpret existing connections. Operator must resolve any existing Meta rows.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.sales_social_integrations WHERE provider_code='META') THEN
  RAISE EXCEPTION 'META_LEGACY_CONNECTION_REVIEW_REQUIRED'; END IF;
END $$;
ALTER TABLE public.sales_social_webhook_receipts ADD COLUMN asset_generation uuid;
UPDATE public.sales_social_webhook_receipts r SET asset_generation=a.generation
 FROM public.sales_social_assets a WHERE a.id=r.asset_id AND a.organization_id=r.organization_id;
ALTER TABLE public.sales_social_webhook_receipts ALTER COLUMN asset_generation SET NOT NULL;

CREATE FUNCTION public.native_meta_require_company(p_org uuid,p_member uuid,p_company text)
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

CREATE FUNCTION public.native_meta_begin(p_org uuid,p_member uuid,p_company text,p_hash text,p_app text,p_reconnect uuid DEFAULT NULL,p_instagram boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_id uuid;
BEGIN
 PERFORM public.native_meta_require_company(p_org,p_member,p_company);
 IF p_hash IS NULL OR p_hash !~ '^[a-f0-9]{64}$' OR p_app IS NULL OR length(p_app) NOT BETWEEN 5 AND 200 THEN
  RAISE EXCEPTION 'META_STATE_INVALID'; END IF;
 IF p_reconnect IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.sales_social_integrations
  WHERE id=p_reconnect AND organization_id=p_org AND company_code=p_company AND provider_code='META') THEN
  RAISE EXCEPTION 'META_CONNECTION_UNAVAILABLE'; END IF;
 INSERT INTO public.sales_social_oauth_states(organization_id,requester_member_id,default_owner_member_id,
  state_hash,company_code,app_id,requested_scopes,return_path,reconnect_integration_id)
 VALUES(p_org,p_member,p_member,p_hash,p_company,p_app,CASE WHEN p_instagram THEN '["pages_show_list","pages_read_engagement","instagram_basic"]'::jsonb ELSE '["pages_show_list"]'::jsonb END,
  '/sales-native/integrations/meta?organization='||p_org::text||'&company='||p_company,p_reconnect) RETURNING id INTO v_id;
 RETURN v_id;
END $$;

CREATE FUNCTION public.native_meta_exchange_claim(p_hash text,p_org uuid,p_member uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE s public.sales_social_oauth_states%ROWTYPE;
BEGIN
 SELECT * INTO s FROM public.sales_social_oauth_states WHERE state_hash=p_hash FOR UPDATE;
 IF NOT FOUND OR s.organization_id<>p_org OR s.requester_member_id<>p_member
  OR s.company_code IS NULL OR s.status<>'PENDING' OR s.expires_at<=now() THEN
  RAISE EXCEPTION 'META_GRANT_UNAVAILABLE'; END IF;
 PERFORM public.native_meta_require_company(p_org,p_member,s.company_code);
 UPDATE public.sales_social_oauth_states SET status='EXCHANGING' WHERE id=s.id;
 RETURN jsonb_build_object('id',s.id,'company',s.company_code,'appId',s.app_id);
END $$;

CREATE FUNCTION public.native_meta_complete(p_org uuid,p_member uuid,p_state uuid,p_grant uuid,p_integration uuid,
 p_user_ciphertext text,p_selected jsonb,p_relationship text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE s public.sales_social_oauth_states%ROWTYPE; d public.sales_social_discovered_assets%ROWTYPE;
 a public.sales_social_assets%ROWTYPE; v_account uuid; v_asset uuid; v_item jsonb; v_count integer:=0;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'SALES_SERVER_ONLY'; END IF;
 SELECT * INTO s FROM public.sales_social_oauth_states WHERE id=p_state FOR UPDATE;
 IF NOT FOUND OR s.organization_id<>p_org OR s.requester_member_id<>p_member OR s.status<>'EXCHANGED'
  OR s.expires_at<=now() OR s.grant_expires_at<=now() OR s.grant_expires_at IS NULL
  OR s.meta_user_id IS NULL OR NOT(s.granted_scopes ? 'pages_show_list') THEN
  RAISE EXCEPTION 'META_GRANT_UNAVAILABLE'; END IF;
 PERFORM public.native_meta_require_company(p_org,p_member,s.company_code);
 IF p_selected IS NULL OR jsonb_typeof(p_selected)<>'array' OR jsonb_array_length(p_selected) NOT BETWEEN 1 AND 100
  OR p_relationship NOT IN ('OWNER_ASSERTED','AGENCY_DELEGATED') OR p_relationship IS NULL
  OR p_grant IS NULL OR p_integration IS NULL OR p_user_ciphertext IS NULL OR length(p_user_ciphertext)>32768 THEN
  RAISE EXCEPTION 'META_SELECTION_INVALID'; END IF;
 IF (SELECT count(DISTINCT x->>'id') FROM jsonb_array_elements(p_selected) x)<>jsonb_array_length(p_selected) THEN
  RAISE EXCEPTION 'META_SELECTION_INVALID'; END IF;
 -- Serialize all asset reservations, including reconnects, in stable external-ID order.
 FOR d IN SELECT da.* FROM public.sales_social_discovered_assets da
  WHERE da.state_id=s.id AND da.id IN (SELECT (x->>'id')::uuid FROM jsonb_array_elements(p_selected) x)
  ORDER BY da.external_id LOOP
  PERFORM pg_advisory_xact_lock(hashtextextended('meta-asset:'||d.external_id,0));
  IF EXISTS(SELECT 1 FROM public.sales_social_asset_ownership own WHERE own.external_id=d.external_id
   AND (own.organization_id<>p_org OR own.company_code<>s.company_code OR s.reconnect_integration_id IS NULL)) THEN
   RAISE EXCEPTION 'META_ASSET_ALREADY_RESERVED'; END IF;
  IF EXISTS(SELECT 1 FROM public.sales_social_asset_ownership own
   JOIN public.sales_social_assets aa ON aa.id=own.asset_id
   JOIN public.sales_social_accounts ac ON ac.id=aa.account_id
   WHERE own.external_id=d.external_id AND ac.integration_id IS DISTINCT FROM s.reconnect_integration_id) THEN
   RAISE EXCEPTION 'META_ASSET_ALREADY_RESERVED'; END IF;
 END LOOP;
 IF s.reconnect_integration_id IS NOT NULL THEN
  IF p_integration<>s.reconnect_integration_id THEN RAISE EXCEPTION 'META_CONNECTION_UNAVAILABLE'; END IF;
  PERFORM 1 FROM public.sales_social_integrations WHERE id=p_integration AND organization_id=p_org
   AND company_code=s.company_code FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'META_CONNECTION_UNAVAILABLE'; END IF;
  UPDATE public.sales_social_grants SET status='REVOKED',token_ciphertext=NULL WHERE id=(
   SELECT grant_id FROM public.sales_social_integrations WHERE id=p_integration);
 ELSE
  INSERT INTO public.sales_social_integrations(id,organization_id,provider_code,company_code,status,created_by,updated_by)
   VALUES(p_integration,p_org,'META',s.company_code,'PENDING',p_member,p_member);
 END IF;
 INSERT INTO public.sales_social_grants(id,organization_id,company_code,authorizer_member_id,meta_user_id,
  app_id,token_ciphertext,expires_at,permissions,status)
 VALUES(p_grant,p_org,s.company_code,p_member,s.meta_user_id,s.app_id,p_user_ciphertext,s.grant_expires_at,s.granted_scopes,'ACTIVE');
 UPDATE public.sales_social_integrations SET grant_id=p_grant,status='CONNECTED',app_id=s.app_id,
  granted_permissions=s.granted_scopes,token_ciphertext=NULL,token_expires_at=s.grant_expires_at,
  connected_at=now(),updated_at=now(),updated_by=p_member
  WHERE id=p_integration;
 SELECT id INTO v_account FROM public.sales_social_accounts WHERE integration_id=p_integration LIMIT 1;
 IF v_account IS NULL THEN
  INSERT INTO public.sales_social_accounts(organization_id,company_code,integration_id,external_account_id,account_type)
   VALUES(p_org,s.company_code,p_integration,p_integration::text,'connection') RETURNING id INTO v_account;
 END IF;
 -- Omitted assets are locally disabled, never represented as provider-unsubscribed.
 UPDATE public.sales_social_assets SET status='DISABLED',token_ciphertext=NULL,generation=gen_random_uuid()
  WHERE organization_id=p_org AND account_id=v_account;
 UPDATE public.sales_social_accounts SET status='ACTIVE' WHERE id=v_account;
 FOR v_item IN SELECT * FROM jsonb_array_elements(p_selected) LOOP
  SELECT * INTO d FROM public.sales_social_discovered_assets WHERE id=(v_item->>'id')::uuid AND state_id=s.id AND organization_id=p_org;
  IF NOT FOUND OR v_item->>'ciphertext' IS NULL OR length(v_item->>'ciphertext')>32768 THEN
   RAISE EXCEPTION 'META_SELECTION_INVALID'; END IF;
  SELECT * INTO a FROM public.sales_social_assets WHERE organization_id=p_org AND account_id=v_account AND external_asset_id=d.external_id;
  IF FOUND THEN
   v_asset:=a.id;
   UPDATE public.sales_social_assets SET token_ciphertext=v_item->>'ciphertext',token_expires_at=s.grant_expires_at,
    status='READY',generation=gen_random_uuid(),webhook_status='INGESTION_DISABLED',relationship=p_relationship,
    reported_business_id=d.reported_business_id WHERE id=v_asset;
  ELSE
   INSERT INTO public.sales_social_assets(organization_id,account_id,company_code,external_asset_id,asset_type,display_name,
    default_owner_member_id,token_ciphertext,token_expires_at,status,webhook_status,relationship,reported_business_id)
   VALUES(p_org,v_account,s.company_code,d.external_id,d.asset_type,d.display_name,p_member,
    v_item->>'ciphertext',s.grant_expires_at,'READY','INGESTION_DISABLED',p_relationship,d.reported_business_id) RETURNING id INTO v_asset;
   INSERT INTO public.sales_social_asset_ownership(external_id,organization_id,company_code,asset_id)
    VALUES(d.external_id,p_org,s.company_code,v_asset);
  END IF;
  v_count:=v_count+1;
 END LOOP;
 UPDATE public.sales_social_oauth_states SET status='CONSUMED',consumed_at=now(),grant_ciphertext=NULL,pages_ciphertext=NULL WHERE id=s.id;
 DELETE FROM public.sales_social_discovered_assets WHERE state_id=s.id;
 INSERT INTO public.sales_history(organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
  VALUES(p_org,'social_connection',p_integration,p_member,'meta.connection.authorized',gen_random_uuid(),
   jsonb_build_object('company',s.company_code,'assetCount',v_count,'ingestionEnabled',false));
 RETURN jsonb_build_object('integrationId',p_integration,'assetCount',v_count,'ingestionEnabled',false);
END $$;

CREATE FUNCTION public.native_meta_disconnect(p_org uuid,p_member uuid,p_integration uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE i public.sales_social_integrations%ROWTYPE;
BEGIN
 SELECT * INTO i FROM public.sales_social_integrations WHERE id=p_integration AND organization_id=p_org AND provider_code='META' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'META_CONNECTION_UNAVAILABLE'; END IF;
 PERFORM public.native_meta_require_company(p_org,p_member,i.company_code);
 UPDATE public.sales_social_integrations SET status='REVOKED',provider_cleanup=CASE WHEN provider_cleanup='NOT_REQUESTED' THEN 'PENDING' ELSE provider_cleanup END,
  token_ciphertext=NULL,token_expires_at=NULL,revoked_at=now(),updated_by=p_member WHERE id=i.id;
 UPDATE public.sales_social_grants SET status='LOCAL_DISABLED',token_ciphertext=NULL WHERE id=i.grant_id;
 UPDATE public.sales_social_assets a SET status='DISABLED',token_ciphertext=NULL,token_expires_at=NULL,
  generation=gen_random_uuid(),webhook_status='PROVIDER_CLEANUP_UNCONFIRMED'
  FROM public.sales_social_accounts ac WHERE a.account_id=ac.id AND ac.integration_id=i.id AND a.organization_id=p_org;
 UPDATE public.sales_social_accounts SET status='REVOKED' WHERE integration_id=i.id AND organization_id=p_org;
 -- Cancel in-flight handoffs so disconnect cannot be undone by an old callback.
 UPDATE public.sales_social_oauth_states SET status='FAILED',grant_ciphertext=NULL,pages_ciphertext=NULL
  WHERE organization_id=p_org AND reconnect_integration_id=i.id AND status<>'CONSUMED';
 DELETE FROM public.sales_social_discovered_assets WHERE state_id IN (
  SELECT id FROM public.sales_social_oauth_states WHERE reconnect_integration_id=i.id AND status='FAILED');
 INSERT INTO public.sales_history(organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
 VALUES(p_org,'social_connection',i.id,p_member,'meta.connection.local_disabled',gen_random_uuid(),'{"providerConfirmed":false}');
 RETURN jsonb_build_object('localDisabled',true,'providerConfirmed',i.provider_cleanup='CONFIRMED');
END $$;

CREATE FUNCTION public.native_meta_exchange_finish(p_state uuid,p_org uuid,p_member uuid,p_meta_user text,
 p_user_ciphertext text,p_expires timestamptz,p_permissions jsonb,p_assets jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE s public.sales_social_oauth_states%ROWTYPE; x jsonb;
BEGIN
 SELECT * INTO s FROM public.sales_social_oauth_states WHERE id=p_state FOR UPDATE;
 IF NOT FOUND OR s.organization_id<>p_org OR s.requester_member_id<>p_member OR s.status<>'EXCHANGING'
  OR s.expires_at<=now() OR p_expires<=now() OR p_expires IS NULL OR p_meta_user IS NULL
  OR length(p_meta_user) NOT BETWEEN 1 AND 200 OR p_user_ciphertext IS NULL
  OR jsonb_typeof(p_permissions) IS DISTINCT FROM 'array' OR NOT(p_permissions ? 'pages_show_list')
  OR jsonb_typeof(p_assets) IS DISTINCT FROM 'array' OR jsonb_array_length(p_assets) NOT BETWEEN 1 AND 2000 THEN
  RAISE EXCEPTION 'META_GRANT_UNAVAILABLE'; END IF;
 PERFORM public.native_meta_require_company(p_org,p_member,s.company_code);
 UPDATE public.sales_social_oauth_states SET status='EXCHANGED',meta_user_id=p_meta_user,
  grant_ciphertext=p_user_ciphertext,grant_expires_at=p_expires,granted_scopes=p_permissions,exchanged_at=now()
  WHERE id=s.id;
 FOR x IN SELECT * FROM jsonb_array_elements(p_assets) LOOP
  INSERT INTO public.sales_social_discovered_assets(id,state_id,organization_id,external_id,asset_type,display_name,
   parent_external_id,reported_business_id,reported_business_name,tasks,token_ciphertext)
  VALUES((x->>'id')::uuid,s.id,p_org,x->>'externalId',x->>'type',x->>'name',x->>'parentId',
   x->>'businessId',x->>'businessName',x->'tasks',x->>'ciphertext');
 END LOOP;
END $$;

CREATE FUNCTION public.native_meta_expire_access() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
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

CREATE FUNCTION public.native_meta_record_health(p_org uuid,p_member uuid,p_integration uuid,p_grant uuid,
 p_result text,p_permissions jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE i public.sales_social_integrations%ROWTYPE;
BEGIN
 SELECT * INTO i FROM public.sales_social_integrations WHERE id=p_integration AND organization_id=p_org AND provider_code='META' FOR UPDATE;
 IF NOT FOUND OR i.grant_id IS DISTINCT FROM p_grant OR i.status NOT IN ('CONNECTED','DEGRADED') THEN
  RAISE EXCEPTION 'META_CONNECTION_UNAVAILABLE'; END IF;
 PERFORM public.native_meta_require_company(p_org,p_member,i.company_code);
 IF p_result IS NULL OR p_result NOT IN ('ACTIVE','ACCESS_REVOKED','PERMISSION_MISSING','ASSET_ACCESS_REMOVED','PROVIDER_UNAVAILABLE')
  OR jsonb_typeof(p_permissions) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'META_HEALTH_INVALID'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.sales_social_grants WHERE id=p_grant AND status='ACTIVE' AND expires_at>now()) THEN
  RAISE EXCEPTION 'META_RECONNECT_REQUIRED'; END IF;
 UPDATE public.sales_social_grants SET checked_at=now(),health_error=CASE WHEN p_result='ACTIVE' THEN NULL ELSE p_result END,
  status=CASE WHEN p_result IN ('ACCESS_REVOKED','PERMISSION_MISSING','ASSET_ACCESS_REMOVED') THEN 'REVOKED' ELSE status END,
  token_ciphertext=CASE WHEN p_result IN ('ACCESS_REVOKED','PERMISSION_MISSING','ASSET_ACCESS_REMOVED') THEN NULL ELSE token_ciphertext END,
  permissions=CASE WHEN p_result IN ('ACTIVE','PERMISSION_MISSING') THEN p_permissions ELSE permissions END WHERE id=p_grant;
 IF p_result IN ('ACCESS_REVOKED','PERMISSION_MISSING','ASSET_ACCESS_REMOVED') THEN
  UPDATE public.sales_social_integrations SET status='DEGRADED' WHERE id=i.id;
  UPDATE public.sales_social_assets a SET status='DISABLED',token_ciphertext=NULL,generation=gen_random_uuid()
   FROM public.sales_social_accounts ac WHERE ac.id=a.account_id AND ac.integration_id=i.id AND a.organization_id=p_org;
 END IF;
 IF p_result IN ('ACTIVE','PERMISSION_MISSING') THEN
  UPDATE public.sales_social_integrations SET granted_permissions=p_permissions WHERE id=i.id;
 END IF;
 INSERT INTO public.sales_history(organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
 VALUES(p_org,'social_connection',i.id,p_member,'meta.connection.health_checked',gen_random_uuid(),jsonb_build_object('result',p_result));
END $$;

-- Ingestion is a database invariant in phase 1, not an environment flag.
-- Preserve original definitions for a data-preserving guarded rollback.
CREATE TABLE public.sales_social_phase1_rpc_backup(name text PRIMARY KEY,definition text NOT NULL);
INSERT INTO public.sales_social_phase1_rpc_backup
 SELECT p.proname,pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN ('native_sales_receive_social_event','native_sales_retry_social_lead','native_sales_claim_social_leads');
CREATE OR REPLACE FUNCTION public.native_sales_receive_social_event(p_external_asset_id text,p_external_event_id text,p_kind text,
 p_occurred_at timestamptz,p_normalized jsonb,p_payload_hash text,p_correlation_id uuid,p_operation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN RAISE EXCEPTION 'META_INGESTION_DISABLED' USING ERRCODE='42501'; END $$;
CREATE OR REPLACE FUNCTION public.native_sales_retry_social_lead(p_receipt_id uuid,p_fields jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN RAISE EXCEPTION 'META_INGESTION_DISABLED' USING ERRCODE='42501'; END $$;
CREATE OR REPLACE FUNCTION public.native_sales_claim_social_leads(p_limit integer DEFAULT 10)
RETURNS SETOF jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN RETURN; END $$;
REVOKE EXECUTE ON FUNCTION public.native_sales_complete_meta_page(uuid,uuid,uuid,uuid,text,text,text,text,text,text,text,timestamptz),
 public.native_sales_refresh_meta_connection(uuid,uuid,uuid,text,text,text,timestamptz,jsonb),
 public.native_sales_mark_meta_page_subscribed(uuid,uuid,uuid),public.native_sales_revoke_meta_connection(uuid,uuid,uuid)
 FROM service_role;
DO $$ DECLARE t text; f record; BEGIN
 FOREACH t IN ARRAY ARRAY['sales_social_company_bindings','sales_social_grants','sales_social_discovered_assets','sales_social_asset_ownership','sales_social_phase1_rpc_backup'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
 END LOOP;
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname IN ('native_meta_require_company','native_meta_begin','native_meta_exchange_claim','native_meta_complete','native_meta_disconnect','native_meta_exchange_finish','native_meta_expire_access','native_meta_record_health') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
 END LOOP;
END $$;
COMMIT;
