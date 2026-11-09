\set ON_ERROR_STOP on
BEGIN;
SET LOCAL request.jwt.claim.role='service_role';
INSERT INTO auth.users(id) VALUES
  ('11000000-0000-4000-8000-000000000011'),
  ('11000000-0000-4000-8000-000000000012'),
  ('11000000-0000-4000-8000-000000000013');
INSERT INTO public.usuarios(id,auth_id,email,nombre,apellido,rol,validado,activo) VALUES
  ('21000000-0000-4000-8000-000000000011','11000000-0000-4000-8000-000000000011',
   'qa-admin-seller@example.invalid','QA','Admin','admin',true,true),
  ('21000000-0000-4000-8000-000000000012','11000000-0000-4000-8000-000000000012',
   'qa-managed-seller@example.invalid','QA','Seller','sin_asignar',true,true),
  ('21000000-0000-4000-8000-000000000013','11000000-0000-4000-8000-000000000013',
   'qa-nonadmin-seller@example.invalid','QA','Nonadmin','sin_asignar',true,true);
INSERT INTO public.sales_organizations(id,code,name,status,approved_by,approved_at) VALUES
  ('31000000-0000-4000-8000-000000000011','qa-seller-admin','QA Seller Admin','active',
   '21000000-0000-4000-8000-000000000011',now());
SELECT public.native_sales_admin_set_seller(
  '21000000-0000-4000-8000-000000000011',
  '21000000-0000-4000-8000-000000000012',
  '31000000-0000-4000-8000-000000000011',true);
SELECT public.native_sales_admin_set_seller(
  '21000000-0000-4000-8000-000000000011',
  '21000000-0000-4000-8000-000000000012',
  '31000000-0000-4000-8000-000000000011',true);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.sales_members WHERE
    organization_id='31000000-0000-4000-8000-000000000011')<>1
    OR (SELECT count(*) FROM public.sales_history WHERE
      organization_id='31000000-0000-4000-8000-000000000011'
      AND action='seller_access_granted')<>1
    OR EXISTS (SELECT 1 FROM public.sales_patient_assignment_order WHERE
      organization_id='31000000-0000-4000-8000-000000000011') THEN
    RAISE EXCEPTION 'SELLER_GRANT_NOT_SCOPED_OR_IDEMPOTENT';
  END IF;
  BEGIN
    PERFORM public.native_sales_admin_set_seller(
      '21000000-0000-4000-8000-000000000013',
      '21000000-0000-4000-8000-000000000012',
      '31000000-0000-4000-8000-000000000011',false);
    RAISE EXCEPTION 'NONADMIN_MUTATION_ACCEPTED';
  EXCEPTION WHEN insufficient_privilege THEN
    IF SQLERRM<>'SELLER_ADMIN_FORBIDDEN' THEN RAISE; END IF;
  END;
END $$;
SELECT public.native_sales_admin_set_seller(
  '21000000-0000-4000-8000-000000000011',
  '21000000-0000-4000-8000-000000000012',
  '31000000-0000-4000-8000-000000000011',false);
DO $$ BEGIN
  IF (SELECT status FROM public.sales_members WHERE
    organization_id='31000000-0000-4000-8000-000000000011')<>'revoked'
    OR (SELECT count(*) FROM public.sales_history WHERE
      organization_id='31000000-0000-4000-8000-000000000011')<>2 THEN
    RAISE EXCEPTION 'SELLER_REVOKE_NOT_AUDITED';
  END IF;
END $$;
ROLLBACK;
