-- Short-lived, tenant-bound Meta OAuth handoff. No state, code, grant or Page token
-- is exposed to browser database roles. A state cannot be reused after selection.
CREATE TABLE public.sales_social_oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.sales_organizations(id) ON DELETE RESTRICT,
  requester_member_id uuid NOT NULL,
  default_owner_member_id uuid NOT NULL,
  default_team_id uuid,
  state_hash text NOT NULL UNIQUE CHECK (state_hash ~ '^[a-f0-9]{64}$'),
  requested_scopes jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(requested_scopes)='array'),
  granted_scopes jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(granted_scopes)='array'),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','EXCHANGED','CONSUMED')),
  grant_ciphertext text,
  pages_ciphertext text,
  grant_expires_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT now()+interval '10 minutes',
  exchanged_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id,requester_member_id)
    REFERENCES public.sales_members(organization_id,id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id,default_owner_member_id)
    REFERENCES public.sales_members(organization_id,id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id,default_team_id)
    REFERENCES public.sales_teams(organization_id,id) ON DELETE RESTRICT,
  UNIQUE (organization_id,id)
);
CREATE INDEX sales_social_oauth_pending_idx ON public.sales_social_oauth_states
  (status,expires_at);
ALTER TABLE public.sales_social_oauth_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sales_social_oauth_states FROM PUBLIC,anon,authenticated,service_role;
GRANT ALL ON public.sales_social_oauth_states TO service_role;

CREATE UNIQUE INDEX sales_social_asset_connected_external_unique
  ON public.sales_social_assets(external_asset_id)
  WHERE status IN ('READY','SUBSCRIBED');

CREATE FUNCTION public.native_sales_complete_meta_page(
  p_state_id uuid,p_organization_id uuid,p_actor_member_id uuid,
  p_integration_id uuid,p_page_id text,p_page_name text,
  p_business_id text,p_business_name text,p_instagram_id text,
  p_user_token_ciphertext text,p_page_token_ciphertext text,p_user_expires_at timestamptz
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=public,pg_temp AS $$
DECLARE v_state public.sales_social_oauth_states%ROWTYPE;
DECLARE v_account_id uuid;
DECLARE v_asset_id uuid;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501'; END IF;
  IF p_state_id IS NULL OR p_organization_id IS NULL OR p_actor_member_id IS NULL
    OR p_integration_id IS NULL OR p_page_id IS NULL OR length(p_page_id) NOT BETWEEN 1 AND 200
    OR p_page_name IS NULL OR length(p_page_name) NOT BETWEEN 1 AND 500
    OR length(coalesce(p_business_id,''))>200 OR length(coalesce(p_business_name,''))>500
    OR length(coalesce(p_instagram_id,''))>200
    OR p_user_token_ciphertext IS NULL OR p_page_token_ciphertext IS NULL
    OR p_user_expires_at IS NULL OR p_user_expires_at<=now() THEN
    RAISE EXCEPTION 'META_CONNECTION_INVALID' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_state FROM public.sales_social_oauth_states
    WHERE id=p_state_id FOR UPDATE;
  IF NOT FOUND OR v_state.organization_id<>p_organization_id
    OR v_state.requester_member_id<>p_actor_member_id
    OR v_state.status<>'EXCHANGED' OR v_state.expires_at<=now()
    OR v_state.grant_ciphertext IS NULL OR v_state.pages_ciphertext IS NULL THEN
    RAISE EXCEPTION 'META_GRANT_UNAVAILABLE' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sales_members WHERE organization_id=p_organization_id
    AND id=v_state.default_owner_member_id AND status='active') THEN
    RAISE EXCEPTION 'META_OWNER_UNAVAILABLE' USING ERRCODE='22023'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sales_social_providers WHERE code='META' AND enabled) THEN
    RAISE EXCEPTION 'META_PROVIDER_DISABLED' USING ERRCODE='42501'; END IF;
  IF EXISTS (SELECT 1 FROM public.sales_social_assets
    WHERE external_asset_id=p_page_id AND status IN ('READY','SUBSCRIBED')) THEN
    RAISE EXCEPTION 'META_PAGE_ALREADY_CONNECTED' USING ERRCODE='23505'; END IF;
  INSERT INTO public.sales_social_integrations
    (id,organization_id,provider_code,external_business_id,external_business_name,
     status,granted_permissions,token_ciphertext,token_expires_at,connected_at,
     created_by,updated_by)
    VALUES (p_integration_id,p_organization_id,'META',nullif(p_business_id,''),
      nullif(p_business_name,''),'CONNECTED',v_state.granted_scopes,
      p_user_token_ciphertext,p_user_expires_at,now(),p_actor_member_id,p_actor_member_id);
  INSERT INTO public.sales_social_accounts
    (organization_id,integration_id,external_account_id,display_name,account_type)
    VALUES (p_organization_id,p_integration_id,coalesce(nullif(p_business_id,''),p_page_id),
      coalesce(nullif(p_business_name,''),p_page_name),
      CASE WHEN nullif(p_business_id,'') IS NULL THEN 'page' ELSE 'business' END)
    RETURNING id INTO v_account_id;
  INSERT INTO public.sales_social_assets
    (organization_id,account_id,external_asset_id,asset_type,display_name,status,
     default_owner_member_id,default_team_id,token_ciphertext,token_expires_at)
    VALUES (p_organization_id,v_account_id,p_page_id,'page',p_page_name,'READY',
      v_state.default_owner_member_id,v_state.default_team_id,
      p_page_token_ciphertext,p_user_expires_at)
    RETURNING id INTO v_asset_id;
  IF nullif(p_instagram_id,'') IS NOT NULL THEN
    INSERT INTO public.sales_social_assets
      (organization_id,account_id,external_asset_id,asset_type,display_name,status,
       default_owner_member_id,default_team_id,token_ciphertext,token_expires_at)
      VALUES (p_organization_id,v_account_id,p_instagram_id,'instagram',
        p_page_name||' Instagram','READY',v_state.default_owner_member_id,
        v_state.default_team_id,p_page_token_ciphertext,p_user_expires_at);
  END IF;
  UPDATE public.sales_social_oauth_states
    SET status='CONSUMED',consumed_at=now(),grant_ciphertext=NULL,pages_ciphertext=NULL
    WHERE id=p_state_id;
  INSERT INTO public.sales_history
    (organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
    VALUES (p_organization_id,'social_connection',p_integration_id,p_actor_member_id,
      'meta.connection.created',gen_random_uuid(),
      jsonb_build_object('assetId',v_asset_id,'pageId',p_page_id));
  RETURN jsonb_build_object('integrationId',p_integration_id,'assetId',v_asset_id,
    'status','READY');
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_complete_meta_page(
  uuid,uuid,uuid,uuid,text,text,text,text,text,text,text,timestamptz)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_complete_meta_page(
  uuid,uuid,uuid,uuid,text,text,text,text,text,text,text,timestamptz)
  TO service_role;

-- Record a successful provider subscription and its audit event together.
CREATE FUNCTION public.native_sales_mark_meta_page_subscribed(
  p_organization_id uuid,p_actor_member_id uuid,p_asset_id uuid
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=public,pg_temp AS $$
DECLARE v_integration_id uuid;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501'; END IF;
  SELECT i.id INTO v_integration_id
    FROM public.sales_social_assets a
    JOIN public.sales_social_accounts ac ON ac.id=a.account_id AND ac.organization_id=a.organization_id
    JOIN public.sales_social_integrations i ON i.id=ac.integration_id
      AND i.organization_id=a.organization_id
    WHERE a.id=p_asset_id AND a.organization_id=p_organization_id
      AND a.asset_type='page' AND a.status IN ('READY','SUBSCRIBED')
      AND i.provider_code='META' AND i.status='CONNECTED'
    FOR UPDATE OF a;
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM public.sales_members
    WHERE organization_id=p_organization_id AND id=p_actor_member_id AND status='active') THEN
    RAISE EXCEPTION 'META_ASSET_UNAVAILABLE' USING ERRCODE='42501'; END IF;
  UPDATE public.sales_social_assets SET status='SUBSCRIBED',
    webhook_status='SUBSCRIBED',last_error_code=NULL WHERE id=p_asset_id;
  INSERT INTO public.sales_history
    (organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
    VALUES (p_organization_id,'social_connection',v_integration_id,p_actor_member_id,
      'meta.page.leadgen_subscribed',gen_random_uuid(),
      jsonb_build_object('assetId',p_asset_id));
  RETURN jsonb_build_object('assetId',p_asset_id,'status','SUBSCRIBED');
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_mark_meta_page_subscribed(uuid,uuid,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_mark_meta_page_subscribed(uuid,uuid,uuid)
  TO service_role;
