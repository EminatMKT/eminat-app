\set ON_ERROR_STOP on
BEGIN;
SET LOCAL request.jwt.claim.role='service_role';
INSERT INTO auth.users(id) VALUES ('10000000-0000-4000-8000-000000000001');
INSERT INTO public.usuarios(id,auth_id) VALUES
  ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001');
INSERT INTO public.sales_organizations(id,code,name,status,approved_by,approved_at) VALUES
  ('30000000-0000-4000-8000-000000000001','qa-social','QA Social','active',
   '20000000-0000-4000-8000-000000000001',now());
INSERT INTO public.sales_members(id,organization_id,user_id,auth_id,role,status,evidence_ref,approved_by,approved_at) VALUES
  ('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',
   'ADMINISTRATOR','active','synthetic','20000000-0000-4000-8000-000000000001',now());
UPDATE public.sales_social_providers SET enabled=true WHERE code='META';
INSERT INTO public.sales_social_integrations
  (id,organization_id,provider_code,status,created_by,updated_by)
  VALUES ('50000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',
    'META','CONNECTED','40000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001');
INSERT INTO public.sales_social_accounts
  (id,organization_id,integration_id,external_account_id,account_type)
  VALUES ('60000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000001','qa-business','business');
INSERT INTO public.sales_social_assets
  (id,organization_id,account_id,external_asset_id,asset_type,status,default_owner_member_id)
  VALUES ('70000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000001','qa-page','page','SUBSCRIBED',
    '40000000-0000-4000-8000-000000000001');
DO $$ DECLARE r jsonb; n jsonb; BEGIN
  n:='{"externalLeadId":"qa-leadgen-1","pageId":"qa-page","formId":"qa-form","campaignId":"qa-campaign","adsetId":"qa-adset","adId":"qa-ad","fields":{"full_name":"QA Social Lead","email":"qa-social@example.invalid"}}'::jsonb;
  r:=public.native_sales_receive_social_event('qa-page','leadgen:qa-leadgen-1','leadgen',
    now(),n,repeat('a',64),gen_random_uuid(),gen_random_uuid());
  IF r->>'status'<>'PROCESSED' OR r->>'replayed'<>'false' THEN RAISE EXCEPTION 'lead acceptance failed'; END IF;
  r:=public.native_sales_receive_social_event('qa-page','leadgen:qa-leadgen-1','leadgen',
    now(),n,repeat('a',64),gen_random_uuid(),gen_random_uuid());
  IF r->>'replayed'<>'true' THEN RAISE EXCEPTION 'lead replay failed'; END IF;
  IF (SELECT count(*) FROM public.sales_leads WHERE organization_id='30000000-0000-4000-8000-000000000001')<>1
    OR (SELECT count(*) FROM public.sales_social_leads WHERE campaign_id='qa-campaign')<>1 THEN
    RAISE EXCEPTION 'lead duplicated or attribution lost'; END IF;
  n:='{"externalSubjectId":"qa-person","channel":"page","text":"QA message"}'::jsonb;
  r:=public.native_sales_receive_social_event('qa-page','message:qa-mid','message',
    now(),n,repeat('b',64),gen_random_uuid(),gen_random_uuid());
  IF r->>'status'<>'PROCESSED' OR (SELECT count(*) FROM public.sales_social_messages)<>1 THEN
    RAISE EXCEPTION 'message ingestion failed'; END IF;
  n:='{"channel":"page","externalCommentId":"qa-comment","text":"QA comment"}'::jsonb;
  r:=public.native_sales_receive_social_event('qa-page','comment:qa-comment','comment',
    now(),n,repeat('c',64),gen_random_uuid(),gen_random_uuid());
  IF r->>'status'<>'PROCESSED' OR (SELECT count(*) FROM public.sales_social_comments)<>1 THEN
    RAISE EXCEPTION 'comment ingestion failed'; END IF;
  n:='{"externalLeadId":"qa-pending","pageId":"qa-page","fields":null}'::jsonb;
  r:=public.native_sales_receive_social_event('qa-page','leadgen:qa-pending','leadgen',
    now(),n,repeat('d',64),gen_random_uuid(),gen_random_uuid());
  IF r->>'status'<>'RETRY' OR (SELECT count(*) FROM public.sales_leads)<>1 THEN
    RAISE EXCEPTION 'pending lead did not queue safely'; END IF;
  r:=public.native_sales_retry_social_lead(
    (SELECT id FROM public.sales_social_webhook_receipts WHERE external_event_id='leadgen:qa-pending'),
    '{"full_name":"QA Recovered Lead","email":"qa-recovered@example.invalid"}'::jsonb);
  IF r->>'status'<>'PROCESSED' OR (SELECT count(*) FROM public.sales_leads)<>2 THEN
    RAISE EXCEPTION 'pending lead retry failed'; END IF;
  IF (SELECT count(*) FROM public.sales_history WHERE action='meta.webhook.accepted')<>4 THEN
    RAISE EXCEPTION 'social event audit incomplete or duplicated'; END IF;
END $$;
ROLLBACK;
