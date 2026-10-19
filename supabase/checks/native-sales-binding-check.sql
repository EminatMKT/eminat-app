\set ON_ERROR_STOP on
BEGIN;
-- Local-only synthetic profile with the exact approved binding identifiers.
-- Roll back both fixtures; the first-binding check must not create Sales rows.
INSERT INTO auth.users(id,email) VALUES
  ('3b1d0b87-083e-46ef-b7e1-1cd662360085','freddy@eminat.net');
INSERT INTO public.usuarios
  (id,auth_id,email,nombre,apellido,rol,validado,activo) VALUES
  ('2344e112-76ef-42a8-ac56-7c488084e0f5',
   '3b1d0b87-083e-46ef-b7e1-1cd662360085',
   'freddy@eminat.net','QA','Binding','admin',true,true);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.empresas WHERE codigo='STRATIX' AND activo) <> 1 THEN
    RAISE EXCEPTION 'Synthetic STRATIX baseline missing';
  END IF;
  IF public.native_sales_controlled_binding('superadmin','check')
      <> 'NATIVE_SALES_BINDING_CHECK_PASS' THEN
    RAISE EXCEPTION 'First-binding check did not pass';
  END IF;
  IF EXISTS (SELECT 1 FROM public.sales_organizations WHERE code='stratix')
      OR EXISTS (SELECT 1 FROM public.sales_members
                 WHERE user_id='2344e112-76ef-42a8-ac56-7c488084e0f5') THEN
    RAISE EXCEPTION 'Check phase changed Sales bindings';
  END IF;
END $$;
ROLLBACK;
