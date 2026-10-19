\set ON_ERROR_STOP on
BEGIN;
SET LOCAL request.jwt.claim.role='service_role';
INSERT INTO auth.users(id) VALUES
  ('10000000-0000-4000-8000-000000000011'),
  ('10000000-0000-4000-8000-000000000012');
INSERT INTO public.usuarios(id,auth_id,email,nombre,apellido,rol,validado,activo) VALUES
  ('20000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000011',
   'qa-seller@example.invalid','QA','Seller','admin',true,true),
  ('20000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000012',
   'qa-owner@example.invalid','QA','Owner','admin',true,true);
INSERT INTO public.sales_organizations(id,code,name,status,approved_by,approved_at) VALUES
  ('30000000-0000-4000-8000-000000000011','qa-seller-denial','QA Seller Denial','active',
   '20000000-0000-4000-8000-000000000011',now());
INSERT INTO public.sales_members
  (id,organization_id,user_id,auth_id,role,status,evidence_ref,approved_by,approved_at) VALUES
  ('40000000-0000-4000-8000-000000000011','30000000-0000-4000-8000-000000000011',
   '20000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000011',
   'SELLER','active','synthetic','20000000-0000-4000-8000-000000000011',now()),
  ('40000000-0000-4000-8000-000000000012','30000000-0000-4000-8000-000000000011',
   '20000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000012',
   'SELLER','active','synthetic','20000000-0000-4000-8000-000000000011',now());
INSERT INTO public.sales_leads
  (id,organization_id,owner_member_id,display_name,source,created_by,updated_by) VALUES
  ('50000000-0000-4000-8000-000000000011','30000000-0000-4000-8000-000000000011',
   '40000000-0000-4000-8000-000000000011','Synthetic Seller Lead','qa',
   '40000000-0000-4000-8000-000000000011','40000000-0000-4000-8000-000000000011');
DO $$
BEGIN
  BEGIN
    PERFORM public.native_sales_reassign_lead(
      '30000000-0000-4000-8000-000000000011',
      '40000000-0000-4000-8000-000000000011',
      '50000000-0000-4000-8000-000000000011',1,
      '40000000-0000-4000-8000-000000000012',NULL,gen_random_uuid());
    RAISE EXCEPTION 'Seller reassignment unexpectedly accepted';
  EXCEPTION WHEN insufficient_privilege THEN
    IF SQLERRM <> 'REASSIGN_FORBIDDEN' THEN RAISE; END IF;
  END;
  IF EXISTS (SELECT 1 FROM public.sales_leads
    WHERE id='50000000-0000-4000-8000-000000000011'
      AND (owner_member_id<>'40000000-0000-4000-8000-000000000011' OR version<>1))
    OR EXISTS (SELECT 1 FROM public.sales_history
      WHERE organization_id='30000000-0000-4000-8000-000000000011') THEN
    RAISE EXCEPTION 'Denied reassignment mutated Sales state';
  END IF;
END $$;
ROLLBACK;
