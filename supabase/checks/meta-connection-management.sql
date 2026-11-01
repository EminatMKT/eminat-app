\set ON_ERROR_STOP on
BEGIN;
SET LOCAL request.jwt.claim.role='service_role';
CREATE FUNCTION pg_temp.meta_id(n integer) RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
 SELECT ('f0000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid $$;
CREATE FUNCTION pg_temp.meta_reject(q text,expected text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 BEGIN EXECUTE q; EXCEPTION WHEN OTHERS THEN
  IF SQLERRM=expected THEN RETURN; ELSE RAISE; END IF;
 END;
 RAISE EXCEPTION 'Expected denial: %',expected;
END $$;
INSERT INTO auth.users(id) SELECT pg_temp.meta_id(n) FROM generate_series(1,4) n;
INSERT INTO public.usuarios(id,auth_id,email,nombre,apellido,rol,validado,activo)
 SELECT pg_temp.meta_id(n),pg_temp.meta_id(n),'meta-phase1-'||n||'@example.invalid','Synthetic','Meta','admin',true,true FROM generate_series(1,4) n;
INSERT INTO public.empresas(codigo,nombre,color,activo) VALUES('META_QA_A','Synthetic A','#7C6FF7',true),('META_QA_B','Synthetic B','#7C6FF7',true),('META_QA_C','Synthetic C','#7C6FF7',true);
INSERT INTO public.usuario_empresas_acceso(usuario_id,empresa_codigo) VALUES
 (pg_temp.meta_id(1),'META_QA_A'),(pg_temp.meta_id(1),'META_QA_B'),
 (pg_temp.meta_id(2),'META_QA_A'),(pg_temp.meta_id(2),'META_QA_B'),
 (pg_temp.meta_id(3),'META_QA_C'),(pg_temp.meta_id(4),'META_QA_A');
INSERT INTO public.sales_organizations(id,code,name,status,approved_by,approved_at)
 SELECT pg_temp.meta_id(n),'meta-qa-'||n,'Synthetic organization '||n,'active',pg_temp.meta_id(1),now() FROM generate_series(21,22) n;
INSERT INTO public.sales_members(id,organization_id,user_id,auth_id,role,status,evidence_ref,approved_by,approved_at)
 SELECT pg_temp.meta_id(10+n),pg_temp.meta_id(CASE WHEN n=3 THEN 22 ELSE 21 END),pg_temp.meta_id(n),pg_temp.meta_id(n),
 CASE WHEN n=4 THEN 'SELLER' ELSE 'ADMINISTRATOR' END,'active','phase1-synthetic',pg_temp.meta_id(1),now() FROM generate_series(1,4) n;
INSERT INTO public.sales_social_company_bindings(organization_id,company_code,approved_by,evidence_ref) VALUES
 (pg_temp.meta_id(21),'META_QA_A',pg_temp.meta_id(1),'synthetic explicit mapping'),
 (pg_temp.meta_id(21),'META_QA_B',pg_temp.meta_id(1),'synthetic explicit mapping'),
 (pg_temp.meta_id(22),'META_QA_C',pg_temp.meta_id(1),'synthetic explicit mapping');
CREATE FUNCTION pg_temp.meta_grant(member_num integer,org_num integer,company text,label text,reconnect uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE s uuid;
BEGIN
 s:=public.native_meta_begin(pg_temp.meta_id(org_num),pg_temp.meta_id(member_num),company,md5(label)||md5(label),'synthetic-app',reconnect);
 PERFORM public.native_meta_exchange_claim(md5(label)||md5(label),pg_temp.meta_id(org_num),pg_temp.meta_id(member_num));
 PERFORM public.native_meta_exchange_finish(s,pg_temp.meta_id(org_num),pg_temp.meta_id(member_num),'synthetic-principal-'||member_num,
  'synthetic-user-ciphertext',now()+interval '1 hour','["pages_show_list"]',jsonb_build_array(
   jsonb_build_object('id',gen_random_uuid(),'externalId','synthetic-page','type','page','name','Synthetic Page','tasks','[]'::jsonb,'ciphertext',repeat('s',20000)),
   jsonb_build_object('id',gen_random_uuid(),'externalId','synthetic-instagram','type','instagram','name','Synthetic Instagram','tasks','[]'::jsonb,'ciphertext',repeat('s',20000))));
 RETURN s;
END $$;
DO $$ DECLARE s uuid; s2 uuid; g uuid; i uuid:=pg_temp.meta_id(301); a uuid; generation_before uuid; result jsonb; total_before integer;
BEGIN
 -- Role, tenant, company access and explicit mapping all independently required.
 PERFORM pg_temp.meta_reject($q$SELECT public.native_meta_require_company(pg_temp.meta_id(22),pg_temp.meta_id(11),'META_QA_C')$q$,'META_COMPANY_ACCESS_DENIED');
 PERFORM pg_temp.meta_reject($q$SELECT public.native_meta_require_company(pg_temp.meta_id(21),pg_temp.meta_id(14),'META_QA_A')$q$,'META_COMPANY_ACCESS_DENIED');
 PERFORM pg_temp.meta_reject($q$SELECT public.native_meta_require_company(pg_temp.meta_id(21),pg_temp.meta_id(11),'META_QA_C')$q$,'META_COMPANY_ACCESS_DENIED');
 DELETE FROM public.usuario_empresas_acceso WHERE usuario_id=pg_temp.meta_id(2) AND empresa_codigo='META_QA_B';
 PERFORM pg_temp.meta_reject($q$SELECT public.native_meta_require_company(pg_temp.meta_id(21),pg_temp.meta_id(12),'META_QA_B')$q$,'META_COMPANY_ACCESS_DENIED');
 PERFORM public.native_meta_require_company(pg_temp.meta_id(21),pg_temp.meta_id(11),'META_QA_B');
 s:=public.native_meta_begin(pg_temp.meta_id(21),pg_temp.meta_id(11),'META_QA_A',repeat('a',64),'synthetic-app');
 PERFORM pg_temp.meta_reject($q$SELECT public.native_meta_exchange_claim(repeat('a',64),pg_temp.meta_id(21),pg_temp.meta_id(12))$q$,'META_GRANT_UNAVAILABLE');
 UPDATE public.sales_social_oauth_states SET expires_at=now()-interval '1 second' WHERE id=s;
 PERFORM pg_temp.meta_reject($q$SELECT public.native_meta_exchange_claim(repeat('a',64),pg_temp.meta_id(21),pg_temp.meta_id(11))$q$,'META_GRANT_UNAVAILABLE');
 s:=pg_temp.meta_grant(11,21,'META_QA_A','first');
 PERFORM pg_temp.meta_reject($q$SELECT public.native_meta_exchange_claim(md5('first')||md5('first'),pg_temp.meta_id(21),pg_temp.meta_id(11))$q$,'META_GRANT_UNAVAILABLE');
 result:=public.native_meta_complete(pg_temp.meta_id(21),pg_temp.meta_id(11),s,gen_random_uuid(),i,'synthetic-grant-cipher',
  jsonb_build_array(jsonb_build_object('id',(SELECT id FROM public.sales_social_discovered_assets WHERE state_id=s AND external_id='synthetic-page'),'ciphertext','synthetic-page-cipher'),
  jsonb_build_object('id',(SELECT id FROM public.sales_social_discovered_assets WHERE state_id=s AND external_id='synthetic-instagram'),'ciphertext','synthetic-instagram-cipher')),'AGENCY_DELEGATED');
 IF result->>'assetCount'<>'2' OR result->>'ingestionEnabled'<>'false' OR result::text~'cipher|token' THEN RAISE EXCEPTION 'Unsafe complete result'; END IF;
 SELECT id,generation INTO a,generation_before FROM public.sales_social_assets WHERE external_asset_id='synthetic-page';
 IF EXISTS(SELECT 1 FROM public.sales_social_assets WHERE status='SUBSCRIBED') THEN RAISE EXCEPTION 'Unexpected subscription'; END IF;
 PERFORM pg_temp.meta_reject(format('SELECT public.native_meta_complete(%L,%L,%L,%L,%L,%L,%L::jsonb,%L)',pg_temp.meta_id(21),pg_temp.meta_id(11),s,gen_random_uuid(),i,'synthetic','[]','OWNER_ASSERTED'),'META_GRANT_UNAVAILABLE');
 -- Second authorizer may reconnect only the same tenant/company/integration.
 s2:=pg_temp.meta_grant(12,21,'META_QA_A','duplicate');
 PERFORM pg_temp.meta_reject(format('SELECT public.native_meta_complete(%L,%L,%L,%L,%L,%L,%L::jsonb,%L)',pg_temp.meta_id(21),pg_temp.meta_id(12),s2,gen_random_uuid(),gen_random_uuid(),'synthetic',
  jsonb_build_array(jsonb_build_object('id',(SELECT id FROM public.sales_social_discovered_assets WHERE state_id=s2 AND external_id='synthetic-page'),'ciphertext','synthetic')),'OWNER_ASSERTED'),'META_ASSET_ALREADY_RESERVED');
 PERFORM pg_temp.meta_reject(format('SELECT public.native_meta_begin(%L,%L,%L,%L,%L,%L)',pg_temp.meta_id(21),pg_temp.meta_id(11),'META_QA_B',repeat('b',64),'synthetic-app',i),'META_CONNECTION_UNAVAILABLE');
 -- Foreign discovered IDs cannot be selected; completion is atomic.
 PERFORM pg_temp.meta_reject(format('SELECT public.native_meta_complete(%L,%L,%L,%L,%L,%L,%L::jsonb,%L)',pg_temp.meta_id(21),pg_temp.meta_id(12),s2,gen_random_uuid(),gen_random_uuid(),'synthetic',
  jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'ciphertext','synthetic')),'OWNER_ASSERTED'),'META_SELECTION_INVALID');
 SELECT count(*) INTO total_before FROM public.sales_social_integrations;
 IF total_before<>1 THEN RAISE EXCEPTION 'Partial completion persisted'; END IF;
 -- Disconnect cancels pending reconnect and preserves external ownership reservation.
 s2:=pg_temp.meta_grant(12,21,'META_QA_A','cancelled',i);
 result:=public.native_meta_disconnect(pg_temp.meta_id(21),pg_temp.meta_id(11),i);
 IF result->>'providerConfirmed'<>'false' OR (SELECT provider_cleanup FROM public.sales_social_integrations WHERE id=i)<>'PENDING' THEN RAISE EXCEPTION 'False provider confirmation'; END IF;
 IF EXISTS(SELECT 1 FROM public.sales_social_assets WHERE token_ciphertext IS NOT NULL) THEN RAISE EXCEPTION 'Local asset token retained'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.sales_social_asset_ownership WHERE external_id='synthetic-page') THEN RAISE EXCEPTION 'Ownership released'; END IF;
 PERFORM pg_temp.meta_reject(format('SELECT public.native_meta_complete(%L,%L,%L,%L,%L,%L,%L::jsonb,%L)',pg_temp.meta_id(21),pg_temp.meta_id(12),s2,gen_random_uuid(),i,'synthetic','[]','OWNER_ASSERTED'),'META_GRANT_UNAVAILABLE');
 -- Cross-tenant claim remains forbidden even after local disconnect.
 s2:=pg_temp.meta_grant(13,22,'META_QA_C','foreign');
 PERFORM pg_temp.meta_reject(format('SELECT public.native_meta_complete(%L,%L,%L,%L,%L,%L,%L::jsonb,%L)',pg_temp.meta_id(22),pg_temp.meta_id(13),s2,gen_random_uuid(),gen_random_uuid(),'synthetic',
  jsonb_build_array(jsonb_build_object('id',(SELECT id FROM public.sales_social_discovered_assets WHERE state_id=s2 AND external_id='synthetic-page'),'ciphertext','synthetic')),'AGENCY_DELEGATED'),'META_ASSET_ALREADY_RESERVED');
 -- Reconnect with another explicitly authorized employee; grant provenance is replaced.
 DELETE FROM public.sales_social_discovered_assets WHERE state_id IN(SELECT id FROM public.sales_social_oauth_states WHERE status<>'CONSUMED');
 s2:=pg_temp.meta_grant(12,21,'META_QA_A','reconnect',i);
 PERFORM public.native_meta_complete(pg_temp.meta_id(21),pg_temp.meta_id(12),s2,gen_random_uuid(),i,'synthetic-new-grant',
  jsonb_build_array(jsonb_build_object('id',(SELECT id FROM public.sales_social_discovered_assets WHERE state_id=s2 AND external_id='synthetic-page'),'ciphertext','synthetic-new-page')),'OWNER_ASSERTED');
 IF (SELECT generation FROM public.sales_social_assets WHERE id=a)=generation_before THEN RAISE EXCEPTION 'Generation reused'; END IF;
 SELECT grant_id INTO g FROM public.sales_social_integrations WHERE id=i;
 IF (SELECT authorizer_member_id FROM public.sales_social_grants WHERE id=g)<>pg_temp.meta_id(12) THEN RAISE EXCEPTION 'Authorizer not replaced'; END IF;
 -- A stale response from an older grant cannot change the new connection.
 PERFORM pg_temp.meta_reject(format('SELECT public.native_meta_record_health(%L,%L,%L,%L,%L,%L::jsonb)',pg_temp.meta_id(21),pg_temp.meta_id(12),i,gen_random_uuid(),'ACCESS_REVOKED','[]'),'META_CONNECTION_UNAVAILABLE');
 PERFORM public.native_meta_record_health(pg_temp.meta_id(21),pg_temp.meta_id(12),i,g,'PROVIDER_UNAVAILABLE','[]');
 IF (SELECT status FROM public.sales_social_grants WHERE id=g)<>'ACTIVE' THEN RAISE EXCEPTION 'Outage revoked access'; END IF;
 PERFORM public.native_meta_record_health(pg_temp.meta_id(21),pg_temp.meta_id(12),i,g,'ACCESS_REVOKED','[]');
 IF (SELECT status FROM public.sales_social_grants WHERE id=g)<>'REVOKED' OR
  EXISTS(SELECT 1 FROM public.sales_social_assets WHERE token_ciphertext IS NOT NULL) THEN RAISE EXCEPTION 'Provider revocation not contained'; END IF;
 DELETE FROM public.sales_social_discovered_assets;
 s2:=pg_temp.meta_grant(12,21,'META_QA_A','expiry',i);
 PERFORM public.native_meta_complete(pg_temp.meta_id(21),pg_temp.meta_id(12),s2,gen_random_uuid(),i,'synthetic-new-grant',
  jsonb_build_array(jsonb_build_object('id',(SELECT id FROM public.sales_social_discovered_assets WHERE state_id=s2 AND external_id='synthetic-page'),'ciphertext','synthetic-new-page')),'OWNER_ASSERTED');
 UPDATE public.sales_social_grants SET expires_at=now()-interval '1 second' WHERE id=(SELECT grant_id FROM public.sales_social_integrations WHERE id=i);
 PERFORM public.native_meta_expire_access();
 IF NOT EXISTS(SELECT 1 FROM public.sales_social_grants WHERE status='EXPIRED' AND token_ciphertext IS NULL) THEN RAISE EXCEPTION 'Expired access retained'; END IF;
 -- Local provider failure is never represented as confirmation.
 UPDATE public.sales_social_integrations SET provider_cleanup='FAILED',provider_cleanup_error='PROVIDER_UNAVAILABLE' WHERE id=i;
 result:=public.native_meta_disconnect(pg_temp.meta_id(21),pg_temp.meta_id(12),i);
 IF result->>'providerConfirmed'<>'false' THEN RAISE EXCEPTION 'Provider failure confirmed'; END IF;
 -- Departed authorizer and expiry destroy local credentials and require reconnect.
 DELETE FROM public.sales_social_discovered_assets;
 s2:=pg_temp.meta_grant(12,21,'META_QA_A','departure',i);
 PERFORM public.native_meta_complete(pg_temp.meta_id(21),pg_temp.meta_id(12),s2,gen_random_uuid(),i,'synthetic-new-grant',
  jsonb_build_array(jsonb_build_object('id',(SELECT id FROM public.sales_social_discovered_assets WHERE state_id=s2 AND external_id='synthetic-page'),'ciphertext','synthetic-new-page')),'OWNER_ASSERTED');
 UPDATE public.sales_members SET status='revoked' WHERE id=pg_temp.meta_id(12);
 PERFORM public.native_meta_expire_access();
 IF (SELECT g.status FROM public.sales_social_grants g JOIN public.sales_social_integrations i ON i.grant_id=g.id WHERE i.id=pg_temp.meta_id(301))<>'AUTHORIZER_DEPARTED'
  OR EXISTS(SELECT 1 FROM public.sales_social_assets WHERE token_ciphertext IS NOT NULL) THEN RAISE EXCEPTION 'Departure not contained'; END IF;
 -- Simulate a separately controlled future transfer and a pre-transfer delayed receipt.
 -- Even if an operator sets a new tenant's asset SUBSCRIBED, the old worker stays fenced.
 INSERT INTO public.sales_social_webhook_receipts(organization_id,asset_id,asset_generation,external_event_id,event_kind,object_type,
  payload_hash,occurred_at,status,correlation_id,operation_id,normalized)
 VALUES(pg_temp.meta_id(21),a,generation_before,'synthetic-delayed','leadgen','page',repeat('a',64),now(),'RETRY',gen_random_uuid(),gen_random_uuid(),'{"externalLeadId":"synthetic-old-lead"}');
 INSERT INTO public.sales_social_integrations(id,organization_id,company_code,provider_code,status,created_by,updated_by)
 VALUES(pg_temp.meta_id(302),pg_temp.meta_id(22),'META_QA_C','META','CONNECTED',pg_temp.meta_id(13),pg_temp.meta_id(13));
 INSERT INTO public.sales_social_accounts(id,organization_id,company_code,integration_id,external_account_id,account_type)
 VALUES(pg_temp.meta_id(402),pg_temp.meta_id(22),'META_QA_C',pg_temp.meta_id(302),'synthetic-transferred-account','connection');
 INSERT INTO public.sales_social_assets(organization_id,company_code,account_id,external_asset_id,asset_type,display_name,status,default_owner_member_id)
 VALUES(pg_temp.meta_id(22),'META_QA_C',pg_temp.meta_id(402),'synthetic-page','page','Synthetic transferred asset','SUBSCRIBED',pg_temp.meta_id(13));
 -- Delayed retries cannot route at all during Phase 1, independent of external-ID reassignment.
 PERFORM pg_temp.meta_reject(format('SELECT public.native_sales_retry_social_lead(%L,%L::jsonb)',gen_random_uuid(),'{"email":"synthetic@example.invalid"}'),'META_INGESTION_DISABLED');
 PERFORM pg_temp.meta_reject($q$SELECT public.native_sales_receive_social_event('synthetic-page','delayed','leadgen',now(),'{}',repeat('a',64),gen_random_uuid(),gen_random_uuid())$q$,'META_INGESTION_DISABLED');
 IF EXISTS(SELECT 1 FROM public.native_sales_claim_social_leads(10)) THEN RAISE EXCEPTION 'Job claimed'; END IF;
 IF EXISTS(SELECT 1 FROM public.sales_leads) OR EXISTS(SELECT 1 FROM public.sales_social_webhook_receipts WHERE organization_id<>pg_temp.meta_id(21) OR status<>'RETRY') THEN RAISE EXCEPTION 'Ingestion occurred'; END IF;
 IF EXISTS(SELECT 1 FROM public.sales_social_integrations WHERE token_ciphertext IS NOT NULL) THEN RAISE EXCEPTION 'Legacy token retained'; END IF;
 IF EXISTS(SELECT 1 FROM pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relname IN ('sales_social_grants','sales_social_company_bindings','sales_social_discovered_assets','sales_social_asset_ownership')
  AND (NOT c.relrowsecurity OR has_table_privilege('authenticated',c.oid,'SELECT') OR has_table_privilege('anon',c.oid,'SELECT'))) THEN RAISE EXCEPTION 'Browser table access'; END IF;
 IF has_function_privilege('authenticated','public.native_meta_disconnect(uuid,uuid,uuid)','EXECUTE') THEN RAISE EXCEPTION 'Browser RPC access'; END IF;
 -- A second company in the same organization and another tenant's different assets work independently.
 DELETE FROM public.sales_social_discovered_assets;
 s2:=pg_temp.meta_grant(11,21,'META_QA_B','company-b');
 UPDATE public.sales_social_discovered_assets SET external_id='company-b-'||external_id WHERE state_id=s2;
 PERFORM public.native_meta_complete(pg_temp.meta_id(21),pg_temp.meta_id(11),s2,gen_random_uuid(),gen_random_uuid(),'synthetic-company-b-grant',
  (SELECT jsonb_agg(jsonb_build_object('id',id,'ciphertext','synthetic-company-b-token')) FROM public.sales_social_discovered_assets WHERE state_id=s2),'OWNER_ASSERTED');
 s2:=pg_temp.meta_grant(13,22,'META_QA_C','company-c');
 UPDATE public.sales_social_discovered_assets SET external_id='company-c-'||external_id WHERE state_id=s2;
 PERFORM public.native_meta_complete(pg_temp.meta_id(22),pg_temp.meta_id(13),s2,gen_random_uuid(),gen_random_uuid(),'synthetic-company-c-grant',
  (SELECT jsonb_agg(jsonb_build_object('id',id,'ciphertext','synthetic-company-c-token')) FROM public.sales_social_discovered_assets WHERE state_id=s2),'AGENCY_DELEGATED');
 IF (SELECT count(DISTINCT company_code) FROM public.sales_social_assets)<>3 THEN RAISE EXCEPTION 'Multi-company assets missing'; END IF;
 BEGIN
  UPDATE public.sales_social_assets SET company_code='META_QA_B' WHERE id=a;
  RAISE EXCEPTION 'Cross-company account assignment accepted';
 EXCEPTION WHEN foreign_key_violation THEN NULL; END;

END $$;
ROLLBACK;
