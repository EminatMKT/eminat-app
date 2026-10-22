-- LILLY-owned, single-use Production QuickBooks OAuth handoff.
-- This migration creates no connection, customer, invoice, payment or membership.
CREATE TABLE public.sales_qbo_oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.sales_organizations(id) ON DELETE RESTRICT,
  requester_member_id uuid NOT NULL,
  state_hash text NOT NULL UNIQUE CHECK (state_hash ~ '^[a-f0-9]{64}$'),
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','CLAIMED','CONSUMED')),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '10 minutes',
  claimed_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id,requester_member_id)
    REFERENCES public.sales_members(organization_id,id) ON DELETE RESTRICT
);
CREATE INDEX sales_qbo_oauth_states_pending_idx
  ON public.sales_qbo_oauth_states(status,expires_at);
ALTER TABLE public.sales_qbo_oauth_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sales_qbo_oauth_states FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT ON public.sales_qbo_oauth_states TO service_role;

CREATE FUNCTION public.native_sales_qbo_claim_oauth_state(
  p_state_hash text,p_organization_id uuid,p_member_id uuid
) RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=public,pg_temp AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501'; END IF;
  UPDATE public.sales_qbo_oauth_states SET status='CLAIMED',claimed_at=now()
    WHERE state_hash=p_state_hash AND organization_id=p_organization_id
      AND requester_member_id=p_member_id AND status='PENDING' AND expires_at>now()
    RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'QBO_OAUTH_STATE_INVALID' USING ERRCODE='42501'; END IF;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_qbo_claim_oauth_state(text,uuid,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_qbo_claim_oauth_state(text,uuid,uuid)
  TO service_role;

CREATE FUNCTION public.native_sales_qbo_finish_oauth_state(
  p_state_id uuid,p_organization_id uuid,p_member_id uuid,p_realm_id text,
  p_access_ciphertext text,p_refresh_ciphertext text,
  p_access_expires_at timestamptz,p_refresh_expires_at timestamptz
) RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=public,pg_temp AS $$
DECLARE v_state public.sales_qbo_oauth_states%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501'; END IF;
  IF p_realm_id !~ '^[0-9]{1,80}$' OR p_access_ciphertext IS NULL
    OR p_refresh_ciphertext IS NULL OR p_access_expires_at<=now()
    OR p_refresh_expires_at<=now() THEN
    RAISE EXCEPTION 'QBO_CONNECTION_INVALID' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_state FROM public.sales_qbo_oauth_states
    WHERE id=p_state_id FOR UPDATE;
  IF NOT FOUND OR v_state.status<>'CLAIMED' OR v_state.expires_at<=now()
    OR v_state.organization_id IS DISTINCT FROM p_organization_id
    OR v_state.requester_member_id IS DISTINCT FROM p_member_id THEN
    RAISE EXCEPTION 'QBO_OAUTH_STATE_INVALID' USING ERRCODE='42501'; END IF;
  IF EXISTS (SELECT 1 FROM public.sales_qbo_connections
    WHERE organization_id=p_organization_id AND environment='production'
      AND realm_id<>p_realm_id) THEN
    RAISE EXCEPTION 'QBO_REALM_CHANGE_REQUIRES_DISCONNECT' USING ERRCODE='42501'; END IF;
  INSERT INTO public.sales_qbo_connections
    (organization_id,environment,realm_id,home_currency,status,
      access_token_ciphertext,refresh_token_ciphertext,access_expires_at,
      refresh_expires_at,connected_at)
  VALUES (p_organization_id,'production',p_realm_id,'USD','CONNECTED',
    p_access_ciphertext,p_refresh_ciphertext,p_access_expires_at,
    p_refresh_expires_at,now())
  ON CONFLICT (organization_id,environment) DO UPDATE SET
    realm_id=EXCLUDED.realm_id,home_currency='USD',status='CONNECTED',
    access_token_ciphertext=EXCLUDED.access_token_ciphertext,
    refresh_token_ciphertext=EXCLUDED.refresh_token_ciphertext,
    access_expires_at=EXCLUDED.access_expires_at,
    refresh_expires_at=EXCLUDED.refresh_expires_at,
    connected_at=now(),updated_at=now();
  UPDATE public.sales_qbo_oauth_states SET status='CONSUMED',consumed_at=now()
    WHERE id=p_state_id;
  INSERT INTO public.sales_history
    (organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
  VALUES (p_organization_id,'qbo_connection',p_state_id,p_member_id,
    'oauth_connected',gen_random_uuid(),jsonb_build_object('environment','production',
      'realmId',p_realm_id));
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_qbo_finish_oauth_state(uuid,uuid,uuid,text,text,text,timestamptz,timestamptz)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_qbo_finish_oauth_state(uuid,uuid,uuid,text,text,text,timestamptz,timestamptz)
  TO service_role;

-- A short lease prevents two workers from rotating the same refresh token.
ALTER TABLE public.sales_qbo_connections
  ADD COLUMN refresh_claim_id uuid,
  ADD COLUMN refresh_claim_expires_at timestamptz;

CREATE FUNCTION public.native_sales_qbo_claim_refresh(
  p_organization_id uuid,p_claim_id uuid
) RETURNS TABLE(realm_id text,refresh_token_ciphertext text)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501'; END IF;
  IF p_claim_id IS NULL THEN
    RAISE EXCEPTION 'QBO_REFRESH_INVALID' USING ERRCODE='22023'; END IF;
  RETURN QUERY UPDATE public.sales_qbo_connections c
    SET refresh_claim_id=p_claim_id,
      refresh_claim_expires_at=now()+interval '30 seconds'
    WHERE c.organization_id=p_organization_id AND c.environment='production'
      AND c.status='CONNECTED' AND c.refresh_expires_at>now()
      AND (c.refresh_claim_id IS NULL OR c.refresh_claim_expires_at<now())
    RETURNING c.realm_id,c.refresh_token_ciphertext;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_qbo_claim_refresh(uuid,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_qbo_claim_refresh(uuid,uuid)
  TO service_role;

CREATE FUNCTION public.native_sales_qbo_finish_refresh(
  p_organization_id uuid,p_claim_id uuid,p_access_ciphertext text,
  p_refresh_ciphertext text,p_access_expires_at timestamptz,
  p_refresh_expires_at timestamptz
) RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=public,pg_temp AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501'; END IF;
  IF p_access_ciphertext IS NULL OR p_refresh_ciphertext IS NULL
    OR p_access_expires_at<=now() OR p_refresh_expires_at<=now() THEN
    RAISE EXCEPTION 'QBO_REFRESH_INVALID' USING ERRCODE='22023'; END IF;
  UPDATE public.sales_qbo_connections SET
    access_token_ciphertext=p_access_ciphertext,
    refresh_token_ciphertext=p_refresh_ciphertext,
    access_expires_at=p_access_expires_at,
    refresh_expires_at=p_refresh_expires_at,
    refresh_claim_id=NULL,refresh_claim_expires_at=NULL,updated_at=now()
    WHERE organization_id=p_organization_id AND environment='production'
      AND status='CONNECTED' AND refresh_claim_id=p_claim_id
      AND refresh_claim_expires_at>now()
    RETURNING organization_id INTO v_id;
  RETURN v_id IS NOT NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_qbo_finish_refresh(uuid,uuid,text,text,timestamptz,timestamptz)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_qbo_finish_refresh(uuid,uuid,text,text,timestamptz,timestamptz)
  TO service_role;

CREATE FUNCTION public.native_sales_qbo_disconnect(
  p_organization_id uuid,p_member_id uuid
) RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=public,pg_temp AS $$
DECLARE v_realm_id text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501'; END IF;
  UPDATE public.sales_qbo_connections SET
    status='DISCONNECTED',access_token_ciphertext=NULL,refresh_token_ciphertext=NULL,
    access_expires_at=NULL,refresh_expires_at=NULL,refresh_claim_id=NULL,
    refresh_claim_expires_at=NULL,updated_at=now()
    WHERE organization_id=p_organization_id AND environment='production'
      AND status<>'DISCONNECTED'
    RETURNING realm_id INTO v_realm_id;
  IF v_realm_id IS NULL THEN RETURN false; END IF;
  INSERT INTO public.sales_history
    (organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
  VALUES (p_organization_id,'qbo_connection',p_organization_id,p_member_id,
    'oauth_disconnected',gen_random_uuid(),jsonb_build_object(
      'environment','production','realmId',v_realm_id));
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_qbo_disconnect(uuid,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_qbo_disconnect(uuid,uuid)
  TO service_role;
