\set ON_ERROR_STOP on
BEGIN;
SET LOCAL request.jwt.claim.role='service_role';
CREATE FUNCTION pg_temp.onboarding_id(n integer) RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
 SELECT ('e0000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid $$;
CREATE FUNCTION pg_temp.onboarding_deny(q text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 BEGIN EXECUTE q; EXCEPTION WHEN insufficient_privilege THEN RETURN; END;
 RAISE EXCEPTION 'Expected onboarding authorization denial';
END $$;
INSERT INTO auth.users(id) SELECT pg_temp.onboarding_id(n) FROM generate_series(1,3) n;
INSERT INTO public.usuarios(id,auth_id,email,nombre,apellido,rol,validado,activo)
 SELECT pg_temp.onboarding_id(n),pg_temp.onboarding_id(n),'onboarding-'||n||'@example.invalid','Synthetic','Admin','sin_asignar',true,true FROM generate_series(1,3) n;
INSERT INTO public.empresas(codigo,nombre,color,activo) VALUES
 ('ONBOARD_A','Synthetic client A','#123456',true),('ONBOARD_B','Synthetic client B','#123456',true),('ONBOARD_OFF','Inactive','#123456',false);
INSERT INTO public.usuario_empresas_acceso(usuario_id,empresa_codigo) VALUES
 (pg_temp.onboarding_id(1),'ONBOARD_A'),(pg_temp.onboarding_id(1),'ONBOARD_OFF'),(pg_temp.onboarding_id(2),'ONBOARD_B'),(pg_temp.onboarding_id(3),'ONBOARD_A');
INSERT INTO public.sales_organizations(id,code,name,status,approved_by,approved_at)
 SELECT pg_temp.onboarding_id(n),'onboard-'||n,'Synthetic agency '||n,'active',pg_temp.onboarding_id(1),now() FROM generate_series(21,22) n;
INSERT INTO public.sales_members(id,organization_id,user_id,auth_id,role,status,evidence_ref,approved_by,approved_at)
 SELECT pg_temp.onboarding_id(n+10),pg_temp.onboarding_id(CASE WHEN n=2 THEN 22 ELSE 21 END),pg_temp.onboarding_id(n),pg_temp.onboarding_id(n),
 CASE WHEN n=3 THEN 'SELLER' ELSE 'ADMINISTRATOR' END,'active','synthetic',pg_temp.onboarding_id(1),now() FROM generate_series(1,3) n;
DO $$ DECLARE options jsonb; state_id uuid; authorized_id uuid; BEGIN
 options:=public.native_meta_onboarding_companies(pg_temp.onboarding_id(21),pg_temp.onboarding_id(11));
 IF jsonb_array_length(options)<>1 OR options->0->>'code'<>'ONBOARD_A' OR options->0->>'enabled'<>'false' THEN
  RAISE EXCEPTION 'Company discovery leaked foreign/inactive companies'; END IF;
 PERFORM pg_temp.onboarding_deny($q$SELECT public.native_meta_manage_company(pg_temp.onboarding_id(22),pg_temp.onboarding_id(11),'ONBOARD_A',true,'OWNER_ASSERTED')$q$);
 PERFORM pg_temp.onboarding_deny($q$SELECT public.native_meta_manage_company(pg_temp.onboarding_id(21),pg_temp.onboarding_id(11),'ONBOARD_B',true,'OWNER_ASSERTED')$q$);
 PERFORM pg_temp.onboarding_deny($q$SELECT public.native_meta_manage_company(pg_temp.onboarding_id(21),pg_temp.onboarding_id(11),'ONBOARD_OFF',true,'OWNER_ASSERTED')$q$);
 PERFORM pg_temp.onboarding_deny($q$SELECT public.native_meta_onboarding_companies(pg_temp.onboarding_id(21),pg_temp.onboarding_id(13))$q$);
 PERFORM pg_temp.onboarding_deny($q$SELECT public.native_meta_manage_company(pg_temp.onboarding_id(21),pg_temp.onboarding_id(13),'ONBOARD_A',true,'OWNER_ASSERTED')$q$);
 PERFORM public.native_meta_manage_company(pg_temp.onboarding_id(21),pg_temp.onboarding_id(11),'ONBOARD_A',true,'AGENCY_DELEGATED');
 PERFORM public.native_meta_require_company(pg_temp.onboarding_id(21),pg_temp.onboarding_id(11),'ONBOARD_A');
 IF (SELECT count(*) FROM public.usuario_empresas_acceso)<>4 THEN RAISE EXCEPTION 'Onboarding granted company access'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.sales_social_company_binding_events WHERE organization_id=pg_temp.onboarding_id(21)
  AND company_code='ONBOARD_A' AND user_id=pg_temp.onboarding_id(1) AND relationship='AGENCY_DELEGATED') THEN RAISE EXCEPTION 'Missing provenance'; END IF;
 state_id:=public.native_meta_begin(pg_temp.onboarding_id(21),pg_temp.onboarding_id(11),'ONBOARD_A',repeat('d',64),'synthetic-app');
 authorized_id:=public.native_meta_begin(pg_temp.onboarding_id(21),pg_temp.onboarding_id(11),'ONBOARD_A',repeat('e',64),'synthetic-app');
 PERFORM public.native_meta_exchange_claim(repeat('e',64),pg_temp.onboarding_id(21),pg_temp.onboarding_id(11));
 PERFORM public.native_meta_exchange_finish(authorized_id,pg_temp.onboarding_id(21),pg_temp.onboarding_id(11),'synthetic-onboarding-principal',
  'synthetic-user-ciphertext',now()+interval '1 hour','["pages_show_list"]',jsonb_build_array(
  jsonb_build_object('id',pg_temp.onboarding_id(70),'externalId','onboarding-reserved-page','type','page','name','Synthetic Page','tasks','[]'::jsonb,'ciphertext','synthetic-page-ciphertext')));
 PERFORM public.native_meta_complete(pg_temp.onboarding_id(21),pg_temp.onboarding_id(11),authorized_id,pg_temp.onboarding_id(71),pg_temp.onboarding_id(72),
  'synthetic-grant-ciphertext',jsonb_build_array(jsonb_build_object('id',pg_temp.onboarding_id(70),'ciphertext','synthetic-final-ciphertext')),'AGENCY_DELEGATED');
 PERFORM public.native_meta_manage_company(pg_temp.onboarding_id(21),pg_temp.onboarding_id(11),'ONBOARD_A',false,'AGENCY_DELEGATED');
 IF (SELECT status FROM public.sales_social_oauth_states WHERE id=state_id)<>'FAILED' THEN RAISE EXCEPTION 'Pending handoff survived disable'; END IF;
 IF EXISTS(SELECT 1 FROM public.sales_social_grants WHERE id=pg_temp.onboarding_id(71) AND (token_ciphertext IS NOT NULL OR status='ACTIVE')) OR
 EXISTS(SELECT 1 FROM public.sales_social_assets WHERE external_asset_id='onboarding-reserved-page' AND (token_ciphertext IS NOT NULL OR status<>'DISABLED')) OR
 NOT EXISTS(SELECT 1 FROM public.sales_social_asset_ownership WHERE external_id='onboarding-reserved-page') THEN RAISE EXCEPTION 'Company disable failed lifecycle/reservation safeguards'; END IF;
 PERFORM pg_temp.onboarding_deny($q$SELECT public.native_meta_require_company(pg_temp.onboarding_id(21),pg_temp.onboarding_id(11),'ONBOARD_A')$q$);
 PERFORM public.native_meta_manage_company(pg_temp.onboarding_id(21),pg_temp.onboarding_id(11),'ONBOARD_A',true,'AGENCY_DELEGATED');
 DELETE FROM public.usuario_empresas_acceso WHERE usuario_id=pg_temp.onboarding_id(1) AND empresa_codigo='ONBOARD_A';
 PERFORM pg_temp.onboarding_deny($q$SELECT public.native_meta_manage_company(pg_temp.onboarding_id(21),pg_temp.onboarding_id(11),'ONBOARD_A',true,'OWNER_ASSERTED')$q$);
 IF public.native_meta_onboarding_companies(pg_temp.onboarding_id(21),pg_temp.onboarding_id(11))<>'[]'::jsonb THEN RAISE EXCEPTION 'Revoked company access still visible'; END IF;
END $$;
SET LOCAL ROLE authenticated;
SELECT pg_temp.onboarding_deny($q$SELECT public.native_meta_manage_company(pg_temp.onboarding_id(21),pg_temp.onboarding_id(11),'ONBOARD_A',true,'OWNER_ASSERTED')$q$);
SELECT pg_temp.onboarding_deny('SELECT * FROM public.sales_social_company_binding_events');
RESET ROLE;
SET LOCAL ROLE anon;
SELECT pg_temp.onboarding_deny($q$SELECT public.native_meta_onboarding_companies(pg_temp.onboarding_id(21),pg_temp.onboarding_id(11))$q$);
SELECT pg_temp.onboarding_deny('SELECT * FROM public.sales_social_company_binding_events');
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT pg_temp.onboarding_deny('DELETE FROM public.sales_social_company_binding_events');
SELECT pg_temp.onboarding_deny('UPDATE public.sales_social_company_binding_events SET active=false');
RESET ROLE;
SELECT 'PASS: self-service company authorization, agency provenance, tenant/role/access denials and browser RPC/table isolation' AS result;
ROLLBACK;
