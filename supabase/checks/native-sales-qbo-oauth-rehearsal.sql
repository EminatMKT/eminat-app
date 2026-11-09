\set ON_ERROR_STOP on
-- Local CI only. Every synthetic row is rolled back.
BEGIN;
SET LOCAL request.jwt.claim.role='service_role';
INSERT INTO auth.users(id) VALUES ('10000000-0000-4000-8000-000000000089');
INSERT INTO public.usuarios(id,auth_id,email,nombre,apellido,rol,validado,activo) VALUES
  ('20000000-0000-4000-8000-000000000089','10000000-0000-4000-8000-000000000089',
   'qa-qbo@example.invalid','QA','QuickBooks','admin',true,true);
INSERT INTO public.sales_organizations(id,code,name,status,approved_by,approved_at) VALUES
  ('30000000-0000-4000-8000-000000000089','qa-qbo','QA QuickBooks','active',
   '20000000-0000-4000-8000-000000000089',now());
INSERT INTO public.sales_members(id,organization_id,user_id,auth_id,role,status,evidence_ref,approved_by,approved_at) VALUES
  ('40000000-0000-4000-8000-000000000089','30000000-0000-4000-8000-000000000089',
   '20000000-0000-4000-8000-000000000089','10000000-0000-4000-8000-000000000089',
   'ADMINISTRATOR','active','synthetic-qbo-oauth-rehearsal',
   '20000000-0000-4000-8000-000000000089',now());
INSERT INTO public.sales_qbo_oauth_states
  (id,organization_id,requester_member_id,state_hash) VALUES
  ('50000000-0000-4000-8000-000000000089','30000000-0000-4000-8000-000000000089',
   '40000000-0000-4000-8000-000000000089',repeat('a',64));
DO $$
DECLARE v_state uuid; v_claim record;
BEGIN
  BEGIN
    PERFORM public.native_sales_qbo_claim_oauth_state(repeat('a',64),
      '30000000-0000-4000-8000-000000000089',gen_random_uuid());
    RAISE EXCEPTION 'wrong actor claimed state';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
  v_state:=public.native_sales_qbo_claim_oauth_state(repeat('a',64),
    '30000000-0000-4000-8000-000000000089',
    '40000000-0000-4000-8000-000000000089');
  IF v_state<>'50000000-0000-4000-8000-000000000089' THEN
    RAISE EXCEPTION 'state claim failed'; END IF;
  BEGIN
    PERFORM public.native_sales_qbo_claim_oauth_state(repeat('a',64),
      '30000000-0000-4000-8000-000000000089',
      '40000000-0000-4000-8000-000000000089');
    RAISE EXCEPTION 'state replay accepted';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
  PERFORM public.native_sales_qbo_finish_oauth_state(v_state,
    '30000000-0000-4000-8000-000000000089',
    '40000000-0000-4000-8000-000000000089','123456789',
    'synthetic-access-ciphertext','synthetic-refresh-ciphertext',
    now()+interval '1 hour',now()+interval '90 days');
  IF (SELECT status FROM public.sales_qbo_oauth_states WHERE id=v_state)<>'CONSUMED'
    OR (SELECT count(*) FROM public.sales_qbo_connections
      WHERE organization_id='30000000-0000-4000-8000-000000000089'
        AND realm_id='123456789' AND status='CONNECTED')<>1 THEN
    RAISE EXCEPTION 'connection not persisted'; END IF;
  INSERT INTO public.sales_qbo_webhook_events
    (organization_id,environment,realm_id,event_fingerprint,entity_type,entity_id,operation)
  VALUES ('30000000-0000-4000-8000-000000000089','production','123456789',
    repeat('b',64),'Invoice','1133','Update');
  BEGIN
    INSERT INTO public.sales_qbo_webhook_events
      (organization_id,environment,realm_id,event_fingerprint,entity_type,entity_id,operation)
    VALUES ('30000000-0000-4000-8000-000000000089','production','123456789',
      repeat('b',64),'Invoice','1133','Update');
    RAISE EXCEPTION 'duplicate webhook accepted';
  EXCEPTION WHEN SQLSTATE '23505' THEN NULL; END;
  BEGIN
    PERFORM public.native_sales_qbo_finish_oauth_state(v_state,
      '30000000-0000-4000-8000-000000000089',
      '40000000-0000-4000-8000-000000000089','123456789',
      'synthetic-access-ciphertext','synthetic-refresh-ciphertext',
      now()+interval '1 hour',now()+interval '90 days');
    RAISE EXCEPTION 'consumed state reused';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
  SELECT * INTO v_claim FROM public.native_sales_qbo_claim_refresh(
    '30000000-0000-4000-8000-000000000089',
    '60000000-0000-4000-8000-000000000089');
  IF v_claim.realm_id<>'123456789' OR
    v_claim.refresh_token_ciphertext<>'synthetic-refresh-ciphertext' THEN
    RAISE EXCEPTION 'refresh claim failed'; END IF;
  IF (SELECT count(*) FROM public.native_sales_qbo_claim_refresh(
    '30000000-0000-4000-8000-000000000089',gen_random_uuid()))<>0 THEN
    RAISE EXCEPTION 'concurrent refresh allowed'; END IF;
  IF NOT public.native_sales_qbo_finish_refresh(
    '30000000-0000-4000-8000-000000000089',
    '60000000-0000-4000-8000-000000000089',
    'synthetic-access-rotated','synthetic-refresh-rotated',
    now()+interval '1 hour',now()+interval '90 days') THEN
    RAISE EXCEPTION 'refresh rotation failed'; END IF;
  SELECT * INTO v_claim FROM public.native_sales_qbo_hold_for_revocation(
    '30000000-0000-4000-8000-000000000089',
    '40000000-0000-4000-8000-000000000089');
  IF NOT FOUND OR v_claim.refresh_token_ciphertext<>'synthetic-refresh-rotated' THEN
    RAISE EXCEPTION 'revoke hold failed'; END IF;
  IF EXISTS (SELECT 1 FROM public.sales_qbo_connections
      WHERE organization_id='30000000-0000-4000-8000-000000000089'
        AND (status<>'RECONNECT_REQUIRED' OR access_token_ciphertext IS NOT NULL
          OR refresh_token_ciphertext<>'synthetic-refresh-rotated')) THEN
    RAISE EXCEPTION 'revoke hold did not disable API access'; END IF;
  IF NOT public.native_sales_qbo_disconnect(
    '30000000-0000-4000-8000-000000000089',
    '40000000-0000-4000-8000-000000000089') THEN
    RAISE EXCEPTION 'disconnect failed'; END IF;
  IF EXISTS (SELECT 1 FROM public.sales_qbo_connections
      WHERE organization_id='30000000-0000-4000-8000-000000000089'
        AND (status<>'DISCONNECTED' OR access_token_ciphertext IS NOT NULL
          OR refresh_token_ciphertext IS NOT NULL))
    OR (SELECT count(*) FROM public.sales_history
      WHERE organization_id='30000000-0000-4000-8000-000000000089'
        AND action IN ('oauth_connected','oauth_token_refreshed',
          'oauth_disconnect_requested','oauth_disconnected'))<>4 THEN
    RAISE EXCEPTION 'disconnect or audit failed'; END IF;
END $$;
ROLLBACK;
