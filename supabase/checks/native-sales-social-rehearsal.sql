\set ON_ERROR_STOP on
BEGIN;
SET LOCAL request.jwt.claim.role='service_role';
-- Synthetic isolated fixtures only; this file is never run against Production.
INSERT INTO auth.users(id) VALUES
 ('10000000-0000-4000-8000-000000000001'),('10000000-0000-4000-8000-000000000002'),
 ('10000000-0000-4000-8000-000000000003'),('10000000-0000-4000-8000-000000000004');
INSERT INTO public.usuarios(id,auth_id,email,nombre,apellido,rol,validado,activo) VALUES
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','qa-meta-admin@example.invalid','QA','Admin','admin',true,true),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','qa-meta-a@example.invalid','QA','Seller A','admin',true,true),
 ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003','qa-meta-b@example.invalid','QA','Seller B','admin',true,true),
 ('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000004','qa-meta-holding@example.invalid','QA','Holding','admin',true,true);
INSERT INTO public.sales_organizations(id,code,name,status,approved_by,approved_at) VALUES
 ('9efab353-46a0-43d1-9901-e3f185dc5d30','emc','Synthetic EMC','active','20000000-0000-4000-8000-000000000001',now()),
 ('30000000-0000-4000-8000-000000000002','qa-other','Synthetic Other','active','20000000-0000-4000-8000-000000000001',now());
INSERT INTO public.sales_members(id,organization_id,user_id,auth_id,role,status,evidence_ref,approved_by,approved_at) VALUES
 ('40000000-0000-4000-8000-000000000001','9efab353-46a0-43d1-9901-e3f185dc5d30','20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','ADMINISTRATOR','active','synthetic','20000000-0000-4000-8000-000000000001',now()),
 ('40000000-0000-4000-8000-000000000002','9efab353-46a0-43d1-9901-e3f185dc5d30','20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','SELLER','active','synthetic','20000000-0000-4000-8000-000000000001',now()),
 ('40000000-0000-4000-8000-000000000003','9efab353-46a0-43d1-9901-e3f185dc5d30','20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003','SELLER','active','synthetic','20000000-0000-4000-8000-000000000001',now()),
 ('c67e9779-9e87-48b0-9f6c-bf6a0c8cebad','9efab353-46a0-43d1-9901-e3f185dc5d30','20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000004','SUPERADMIN','pending','synthetic',NULL,NULL);
INSERT INTO public.sales_teams(id,organization_id,name) VALUES
 ('45000000-0000-4000-8000-000000000001','9efab353-46a0-43d1-9901-e3f185dc5d30','Corazón Salud Sales');
INSERT INTO public.sales_team_members(organization_id,team_id,member_id)
 SELECT '9efab353-46a0-43d1-9901-e3f185dc5d30','45000000-0000-4000-8000-000000000001',id
 FROM public.sales_members WHERE role='SELLER';
INSERT INTO public.sales_patient_assignment_order(organization_id,member_id,position) VALUES
 ('9efab353-46a0-43d1-9901-e3f185dc5d30','40000000-0000-4000-8000-000000000002',1),
 ('9efab353-46a0-43d1-9901-e3f185dc5d30','40000000-0000-4000-8000-000000000003',2);
UPDATE public.sales_social_providers SET enabled=true WHERE code='META';
INSERT INTO public.sales_social_integrations(id,organization_id,provider_code,status,app_id,external_business_id,created_by,updated_by)
 VALUES('50000000-0000-4000-8000-000000000001','9efab353-46a0-43d1-9901-e3f185dc5d30','META','CONNECTED','919434760646769','1865633431087642','40000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001');
INSERT INTO public.sales_social_accounts(id,organization_id,integration_id,external_account_id,account_type)
 VALUES('60000000-0000-4000-8000-000000000001','9efab353-46a0-43d1-9901-e3f185dc5d30','50000000-0000-4000-8000-000000000001','1865633431087642','business');
INSERT INTO public.sales_social_assets(id,organization_id,account_id,external_asset_id,asset_type,status,default_owner_member_id)
 VALUES('70000000-0000-4000-8000-000000000001','9efab353-46a0-43d1-9901-e3f185dc5d30','60000000-0000-4000-8000-000000000001','405695562628937','page','SUBSCRIBED','40000000-0000-4000-8000-000000000001');

CREATE FUNCTION pg_temp.meta_delivery(p_id text,p_fields jsonb) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE r jsonb; receipt uuid; BEGIN
 r:=public.native_sales_receive_social_event('405695562628937','leadgen:'||p_id,'leadgen',now(),
  jsonb_build_object('externalLeadId',p_id,'pageId','405695562628937','formId','612660371798285'),
  md5(p_id)||md5(p_id),gen_random_uuid(),gen_random_uuid());
 IF r->>'replayed'='true' THEN RETURN r; END IF;
 SELECT id INTO receipt FROM public.sales_social_webhook_receipts WHERE external_event_id='leadgen:'||p_id;
 RETURN public.native_sales_retry_social_lead(receipt,p_fields||'{"_form_id":"612660371798285"}'::jsonb);
END $$;
DO $$ DECLARE r jsonb; n jsonb; lead_a uuid; lead_b uuid; contact uuid; before_count integer; BEGIN
 r:=pg_temp.meta_delivery('1001','{"full_name":"Synthetic QA A","email":"qa-a@example.invalid","phone_number":"+12025550101","_ad_id":"123","_campaign_id":"456"}');
 IF r->>'status'<>'PROCESSED' THEN RAISE EXCEPTION 'valid lead failed'; END IF;
 SELECT lead_id INTO lead_a FROM public.sales_social_leads WHERE external_lead_id='1001';
 IF NOT EXISTS(SELECT 1 FROM public.sales_leads WHERE id=lead_a AND owner_member_id='40000000-0000-4000-8000-000000000002' AND source='Meta') THEN RAISE EXCEPTION 'round robin first seller failed'; END IF;
 r:=pg_temp.meta_delivery('1001','{"email":"qa-a@example.invalid"}');
 IF r->>'replayed'<>'true' OR (SELECT count(*) FROM public.sales_activities WHERE lead_id=lead_a)<>1 THEN RAISE EXCEPTION 'replay task/lead duplicated'; END IF;
 r:=pg_temp.meta_delivery('1002','{"email":"qa-b@example.invalid"}');
 SELECT lead_id INTO lead_b FROM public.sales_social_leads WHERE external_lead_id='1002';
 IF NOT EXISTS(SELECT 1 FROM public.sales_leads WHERE id=lead_b AND phone IS NULL AND owner_member_id='40000000-0000-4000-8000-000000000003') THEN RAISE EXCEPTION 'missing phone/round robin second failed'; END IF;
 r:=pg_temp.meta_delivery('1003','{"phone_number":"+12025550103"}');
 IF r->>'status'<>'PROCESSED' THEN RAISE EXCEPTION 'missing email failed'; END IF;
 r:=pg_temp.meta_delivery('1004','{"email":"QA-A@example.invalid"}');
 r:=pg_temp.meta_delivery('1005','{"phone_number":"+12025550101"}');
 IF (SELECT count(*) FROM public.sales_leads)<>3 OR (SELECT count(*) FROM public.sales_activities)<>3 THEN RAISE EXCEPTION 'email/phone reconciliation duplicated'; END IF;
 IF (SELECT campaign_id FROM public.sales_social_leads WHERE external_lead_id='1001')<>'456' THEN RAISE EXCEPTION 'attribution failed'; END IF;
 r:=pg_temp.meta_delivery('1006','{"email":"qa-b@example.invalid","phone_number":"+12025550101"}');
 IF r->>'status'<>'FAILED' THEN RAISE EXCEPTION 'ambiguous people merged'; END IF;
 r:=pg_temp.meta_delivery('1007','{"full_name":"No identifier"}');
 IF r->>'status'<>'FAILED' THEN RAISE EXCEPTION 'missing identifiers accepted'; END IF;
 -- A Contact must reconcile through lineage and retain its existing owner.
 INSERT INTO public.sales_contacts(organization_id,owner_member_id,display_name,email,created_by,updated_by)
 VALUES('9efab353-46a0-43d1-9901-e3f185dc5d30','40000000-0000-4000-8000-000000000003','Synthetic Contact','qa-contact@example.invalid','40000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001') RETURNING id INTO contact;
 r:=pg_temp.meta_delivery('1008','{"email":"qa-contact@example.invalid"}');
 IF NOT EXISTS(SELECT 1 FROM public.sales_leads WHERE origin_contact_id=contact AND owner_member_id='40000000-0000-4000-8000-000000000003') THEN RAISE EXCEPTION 'contact reconciliation failed'; END IF;
 UPDATE public.sales_patient_assignment_order SET enabled=false;
 r:=pg_temp.meta_delivery('1009','{"email":"qa-unassigned@example.invalid"}');
 IF NOT EXISTS(SELECT 1 FROM public.sales_leads WHERE email='qa-unassigned@example.invalid' AND source_detail='Needs Assignment' AND owner_member_id='c67e9779-9e87-48b0-9f6c-bf6a0c8cebad') OR NOT EXISTS(SELECT 1 FROM public.sales_activities WHERE title='Assign Meta lead to EMC seller' AND assignee_member_id IS NULL) THEN RAISE EXCEPTION 'unassigned fallback failed'; END IF;
 -- Unknown assets/forms, DMs, API bypass and conflicting replays fail before persistence.
 n:='{"externalLeadId":"1010","pageId":"405695562628937","formId":"999"}';
 BEGIN PERFORM public.native_sales_receive_social_event('405695562628937','leadgen:1010','leadgen',now(),n,repeat('a',64),gen_random_uuid(),gen_random_uuid()); RAISE EXCEPTION 'unknown form accepted'; EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
 n:='{"externalLeadId":"1010","pageId":"999","formId":"612660371798285"}';
 BEGIN PERFORM public.native_sales_receive_social_event('999','leadgen:1010','leadgen',now(),n,repeat('a',64),gen_random_uuid(),gen_random_uuid()); RAISE EXCEPTION 'unknown page accepted'; EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
 BEGIN PERFORM public.native_sales_receive_social_event('405695562628937','message:1010','message',now(),n,repeat('a',64),gen_random_uuid(),gen_random_uuid()); RAISE EXCEPTION 'DM accepted'; EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
 n:='{"externalLeadId":"1010","pageId":"405695562628937","formId":"612660371798285","fields":{"email":"qa@example.invalid"}}';
 BEGIN PERFORM public.native_sales_receive_social_event('405695562628937','leadgen:1010','leadgen',now(),n,repeat('a',64),gen_random_uuid(),gen_random_uuid()); RAISE EXCEPTION 'API bypass accepted'; EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
 n:='{"externalLeadId":"1001","pageId":"405695562628937","formId":"612660371798285"}';
 BEGIN PERFORM public.native_sales_receive_social_event('405695562628937','leadgen:1001','leadgen',now(),n,repeat('a',64),gen_random_uuid(),gen_random_uuid()); RAISE EXCEPTION 'conflicting replay accepted'; EXCEPTION WHEN SQLSTATE '23505' THEN NULL; END;
 -- Deferred API failure/retry preserves the durable receipt and lease; no duplicate CRM row.
 PERFORM public.native_sales_receive_social_event('405695562628937','leadgen:1011','leadgen',now(),'{"externalLeadId":"1011","pageId":"405695562628937","formId":"612660371798285"}',repeat('b',64),gen_random_uuid(),gen_random_uuid());
 IF (SELECT count(*) FROM public.native_sales_claim_social_leads(10))<>1 OR (SELECT count(*) FROM public.native_sales_claim_social_leads(10))<>0 THEN RAISE EXCEPTION 'lease duplicated'; END IF;
 PERFORM public.native_sales_fail_social_lead((SELECT id FROM public.sales_social_webhook_receipts WHERE external_event_id='leadgen:1011'),'META_LEAD_FETCH_FAILED');
 r:=public.native_sales_retry_social_lead((SELECT id FROM public.sales_social_webhook_receipts WHERE external_event_id='leadgen:1011'),'{"email":"qa-retry@example.invalid","_form_id":"612660371798285"}');
 IF r->>'status'<>'PROCESSED' THEN RAISE EXCEPTION 'retry failed'; END IF;
 IF EXISTS(SELECT 1 FROM public.sales_social_webhook_receipts WHERE normalized ? 'fields') OR EXISTS(SELECT 1 FROM public.sales_social_messages) THEN RAISE EXCEPTION 'answers/DMs retained'; END IF;
 IF has_function_privilege('authenticated','public.native_sales_receive_social_event(text,text,text,timestamptz,jsonb,text,uuid,uuid)','EXECUTE') THEN RAISE EXCEPTION 'browser can ingest'; END IF;
 IF (SELECT count(*) FROM public.native_sales_visible_leads('9efab353-46a0-43d1-9901-e3f185dc5d30','40000000-0000-4000-8000-000000000001',100,0,NULL,NULL))<>6 THEN RAISE EXCEPTION 'supervisor visibility failed'; END IF;
 IF (public.native_sales_report_summary('9efab353-46a0-43d1-9901-e3f185dc5d30','40000000-0000-4000-8000-000000000001')#>>'{leads,total}')::integer<>6 THEN RAISE EXCEPTION 'dashboard/report total missing Meta leads'; END IF;
 IF (public.native_sales_report_summary('9efab353-46a0-43d1-9901-e3f185dc5d30','40000000-0000-4000-8000-000000000002')#>>'{leads,total}')::integer<>2 THEN RAISE EXCEPTION 'seller dashboard/report scope expanded'; END IF;
 IF EXISTS(SELECT 1 FROM public.native_sales_visible_leads('9efab353-46a0-43d1-9901-e3f185dc5d30','40000000-0000-4000-8000-000000000002',100,0,NULL,NULL) WHERE owner_member_id<>'40000000-0000-4000-8000-000000000002') THEN RAISE EXCEPTION 'seller scope expanded'; END IF;
 BEGIN PERFORM * FROM public.native_sales_visible_leads('30000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000001',100,0,NULL,NULL); RAISE EXCEPTION 'wrong organization accepted'; EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
  UPDATE public.sales_social_assets SET status='DISABLED' WHERE external_asset_id='405695562628937';
  INSERT INTO public.sales_social_oauth_states
    (id,organization_id,requester_member_id,default_owner_member_id,state_hash,status,
     grant_ciphertext,pages_ciphertext,grant_expires_at,granted_scopes)
    VALUES ('80000000-0000-4000-8000-000000000001',
      '9efab353-46a0-43d1-9901-e3f185dc5d30','40000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-000000000001',repeat('f',64),'EXCHANGED',
      'synthetic-sealed-grant','synthetic-sealed-pages',now()+interval '1 day',
      '["pages_show_list","pages_manage_metadata","leads_retrieval"]'::jsonb);
  r:=public.native_sales_complete_meta_page(
    '80000000-0000-4000-8000-000000000001',
    '9efab353-46a0-43d1-9901-e3f185dc5d30',
    '40000000-0000-4000-8000-000000000001',
    '90000000-0000-4000-8000-000000000001',
    '405695562628937','QA EMC Page','1865633431087642','Stratix Communications',NULL,
    'synthetic-user-ciphertext','synthetic-page-ciphertext',now()+interval '1 day');
  IF r->>'status'<>'READY' OR
    (SELECT status FROM public.sales_social_oauth_states
      WHERE id='80000000-0000-4000-8000-000000000001')<>'CONSUMED' OR
    (SELECT grant_ciphertext FROM public.sales_social_oauth_states
      WHERE id='80000000-0000-4000-8000-000000000001') IS NOT NULL THEN
    RAISE EXCEPTION 'OAuth grant not consumed safely'; END IF;
  r:=public.native_sales_mark_meta_page_subscribed(
    '9efab353-46a0-43d1-9901-e3f185dc5d30',
    '40000000-0000-4000-8000-000000000001',
    (SELECT id FROM public.sales_social_assets WHERE external_asset_id='405695562628937' AND account_id IN
        (SELECT id FROM public.sales_social_accounts WHERE integration_id='90000000-0000-4000-8000-000000000001')));
  IF r->>'status'<>'SUBSCRIBED' OR
    (SELECT webhook_status FROM public.sales_social_assets
      WHERE external_asset_id='405695562628937' AND account_id IN
        (SELECT id FROM public.sales_social_accounts WHERE integration_id='90000000-0000-4000-8000-000000000001'))<>'SUBSCRIBED' OR
    (SELECT count(*) FROM public.sales_history
      WHERE action='meta.page.leadgen_subscribed')<>1 THEN
    RAISE EXCEPTION 'Page subscription state or audit incomplete'; END IF;
  r:=public.native_sales_refresh_meta_connection(
    '9efab353-46a0-43d1-9901-e3f185dc5d30',
    '40000000-0000-4000-8000-000000000001',
    '90000000-0000-4000-8000-000000000001',
    '405695562628937','refreshed-user-ciphertext','refreshed-page-ciphertext',
    now()+interval '30 days','["pages_show_list","pages_manage_metadata","leads_retrieval"]'::jsonb);
  IF r->>'status'<>'CONNECTED' OR
    (SELECT token_ciphertext FROM public.sales_social_assets
      WHERE external_asset_id='405695562628937' AND account_id IN
        (SELECT id FROM public.sales_social_accounts WHERE integration_id='90000000-0000-4000-8000-000000000001'))<>'refreshed-page-ciphertext' OR
    (SELECT count(*) FROM public.sales_history WHERE action='meta.connection.refreshed')<>1 THEN
    RAISE EXCEPTION 'Meta token refresh did not persist atomically'; END IF;
  BEGIN
    PERFORM public.native_sales_complete_meta_page(
      '80000000-0000-4000-8000-000000000001',
      '9efab353-46a0-43d1-9901-e3f185dc5d30',
      '40000000-0000-4000-8000-000000000001',
      gen_random_uuid(),'405695562628937','QA EMC Page','1865633431087642','Stratix Communications',NULL,
      'synthetic-user-ciphertext','synthetic-page-ciphertext',now()+interval '1 day');
    RAISE EXCEPTION 'OAuth grant replay accepted';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
  r:=public.native_sales_revoke_meta_connection(
    '9efab353-46a0-43d1-9901-e3f185dc5d30',
    '40000000-0000-4000-8000-000000000001',
    '90000000-0000-4000-8000-000000000001');
  IF r->>'status'<>'REVOKED' OR
    (SELECT token_ciphertext FROM public.sales_social_integrations
      WHERE id='90000000-0000-4000-8000-000000000001') IS NOT NULL OR
    (SELECT token_ciphertext FROM public.sales_social_assets
      WHERE external_asset_id='405695562628937' AND account_id IN
        (SELECT id FROM public.sales_social_accounts WHERE integration_id='90000000-0000-4000-8000-000000000001')) IS NOT NULL OR
    (SELECT status FROM public.sales_social_assets
      WHERE external_asset_id='405695562628937' AND account_id IN
        (SELECT id FROM public.sales_social_accounts WHERE integration_id='90000000-0000-4000-8000-000000000001'))<>'DISABLED' OR
    (SELECT count(*) FROM public.sales_history WHERE action='meta.connection.revoked')<>1 THEN
    RAISE EXCEPTION 'Meta local revocation did not destroy tokens or preserve audit'; END IF;

END $$;
ROLLBACK;
