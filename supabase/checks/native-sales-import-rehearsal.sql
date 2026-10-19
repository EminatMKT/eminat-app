\set ON_ERROR_STOP on
BEGIN;
SET LOCAL request.jwt.claim.role='service_role';
\ir ../migrations/20261018070000_native_sales_lead_edit.sql
\ir ../migrations/20261018140000_native_sales_directory_edit.sql
\ir ../migrations/20261018160000_native_sales_import_record.sql
INSERT INTO auth.users(id) VALUES ('10000000-0000-4000-8000-000000000001');
INSERT INTO public.usuarios(id,auth_id) VALUES
  ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001');
INSERT INTO public.sales_organizations(id,code,name,status,approved_by,approved_at) VALUES
  ('30000000-0000-4000-8000-000000000001','qa-import','QA Import','active',
   '20000000-0000-4000-8000-000000000001',now());
INSERT INTO public.sales_members(id,organization_id,user_id,auth_id,role,status,evidence_ref,approved_by,approved_at) VALUES
  ('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',
   'SELLER','active','synthetic','20000000-0000-4000-8000-000000000001',now());
DO $$
DECLARE r jsonb; h text; d jsonb;
BEGIN
  d:='{"displayName":"QA Import Lead","source":"qa","email":"qa-import@example.invalid","firstName":"QA","plan":"ESSENTIAL","address":{"city":"Test City"},"dateOfBirth":"1990-01-01"}'::jsonb;
  h:=repeat('a',64);
  r:=public.native_sales_import_record('30000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001','leads',d,'imp_testlead0001',h,'SKIP',gen_random_uuid());
  IF r->>'status'<>'CREATED' THEN RAISE EXCEPTION 'lead create failed'; END IF;
  IF (SELECT plan FROM public.sales_leads WHERE id=(r->>'recordId')::uuid)<>'ESSENTIAL' THEN
    RAISE EXCEPTION 'lead detail lost'; END IF;
  r:=public.native_sales_import_record('30000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001','leads',d,'imp_testlead0001',h,'SKIP',gen_random_uuid());
  IF r->>'status'<>'CREATED' OR r->>'replayed'<>'true' THEN RAISE EXCEPTION 'replay failed'; END IF;
  d:='{"displayName":"QA Duplicate","source":"qa","email":"qa-import@example.invalid"}'::jsonb;
  h:=repeat('a',64);
  r:=public.native_sales_import_record('30000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001','leads',d,'imp_testlead0002',h,'SKIP',gen_random_uuid());
  IF r->>'status'<>'SKIPPED' THEN RAISE EXCEPTION 'duplicate not skipped'; END IF;
  IF (SELECT count(*) FROM public.sales_leads WHERE organization_id='30000000-0000-4000-8000-000000000001')<>1 THEN
    RAISE EXCEPTION 'duplicate changed lead count'; END IF;
  h:=repeat('b',64);
  BEGIN
    PERFORM public.native_sales_import_record('30000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-000000000001','leads',d,'imp_testlead0001',h,'SKIP',gen_random_uuid());
    RAISE EXCEPTION 'changed payload accepted on replay';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  d:='{"displayName":"QA Import Contact","email":"contact-import@example.invalid","firstName":"QA","lastName":"Person","plan":"PLUS"}'::jsonb;
  h:=repeat('a',64);
  r:=public.native_sales_import_record('30000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001','contacts',d,'imp_testcontact1',h,'SKIP',gen_random_uuid());
  IF r->>'status'<>'CREATED' THEN RAISE EXCEPTION 'contact create failed'; END IF;
  IF (SELECT plan FROM public.sales_contacts WHERE id=(r->>'recordId')::uuid)<>'PLUS' THEN
    RAISE EXCEPTION 'contact detail lost'; END IF;
END $$;
ROLLBACK;
