\set ON_ERROR_STOP on
DROP SCHEMA public CASCADE; CREATE SCHEMA public; DROP SCHEMA auth CASCADE; DROP ROLE anon; DROP ROLE authenticated; DROP ROLE service_role;
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.role',true),'') $$;
GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon,authenticated,service_role;
CREATE TABLE public.usuarios(id uuid PRIMARY KEY,auth_id uuid,activo boolean,marca_hora boolean,tipo_jornada text);
CREATE TABLE public.marcaciones(id uuid DEFAULT gen_random_uuid(),usuario_id uuid,fecha date,hora_entrada timestamptz,ip_entrada text,hora_salida timestamptz,ip_salida text,UNIQUE(usuario_id,fecha));
INSERT INTO public.usuarios VALUES('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000021',true,true,'normal'),('00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000022',true,true,'normal'),('00000000-0000-4000-8000-000000000013','00000000-0000-4000-8000-000000000023',false,true,'normal');
\i docs/releases/security-closure/attendance-proposal.sql
SET ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM public.registrar_entrada('00000000-0000-4000-8000-000000000011'); RAISE EXCEPTION 'ANON_ALLOWED'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.registrar_salida('00000000-0000-4000-8000-000000000011'); RAISE EXCEPTION 'ANON_EXIT_ALLOWED'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.role','authenticated',false);
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000021',false);
DO $$ BEGIN
 BEGIN PERFORM public.registrar_entrada('00000000-0000-4000-8000-000000000012'); RAISE EXCEPTION 'CROSS_USER_ALLOWED'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.registrar_salida('00000000-0000-4000-8000-000000000012'); RAISE EXCEPTION 'CROSS_USER_EXIT_ALLOWED'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF public.registrar_entrada('00000000-0000-4000-8000-000000000011') IS NULL THEN RAISE EXCEPTION 'SELF_ENTRY_FAILED'; END IF;
 IF public.registrar_entrada('00000000-0000-4000-8000-000000000011') IS NOT NULL THEN RAISE EXCEPTION 'IDEMPOTENCY_FAILED'; END IF;
 PERFORM public.registrar_salida('00000000-0000-4000-8000-000000000011');
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000023',false);
DO $$ BEGIN
 BEGIN PERFORM public.registrar_entrada('00000000-0000-4000-8000-000000000013'); RAISE EXCEPTION 'INACTIVE_ALLOWED'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET ROLE service_role;
SELECT set_config('request.jwt.claim.role','service_role',false);
DO $$ BEGIN
 IF public.registrar_entrada('00000000-0000-4000-8000-000000000012') IS NULL THEN RAISE EXCEPTION 'SERVICE_ENTRY_FAILED'; END IF;
 PERFORM public.registrar_salida('00000000-0000-4000-8000-000000000012');
END $$;
RESET ROLE;
DO $$ BEGIN IF (SELECT count(*) FROM public.marcaciones WHERE hora_salida IS NOT NULL) <> 2 THEN RAISE EXCEPTION 'RESULT_INTEGRITY_FAILED'; END IF; END $$;
SELECT 'ATTENDANCE_ISOLATED_FIXTURE_PASS' AS result;
