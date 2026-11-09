\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database()<>'corazon_privileged_audit_synthetic' OR to_regclass('public.sales_organizations') IS NOT NULL OR to_regclass('public.usuarios') IS NOT NULL THEN RAISE EXCEPTION 'ISOLATED_SYNTHETIC_DATABASE_REQUIRED'; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF; IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF; IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF; END $$;
CREATE SCHEMA auth;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT current_setting('request.jwt.claim.role',true) $$;
GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
\i docs/releases/security-operations/privileged-audit-proposal.sql
SET ROLE anon;
DO $$ BEGIN BEGIN PERFORM public.native_security_append_privileged_event(gen_random_uuid(),'admin.role.created',gen_random_uuid(),null,null,null,'{}'); RAISE EXCEPTION 'ANON_ALLOWED'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END $$;
RESET ROLE;
SET ROLE authenticated;
DO $$ BEGIN BEGIN PERFORM public.native_security_append_privileged_event(gen_random_uuid(),'admin.role.created',gen_random_uuid(),null,null,null,'{}'); RAISE EXCEPTION 'AUTHENTICATED_ALLOWED'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END $$;
RESET ROLE;
SET ROLE service_role;
SELECT set_config('request.jwt.claim.role','service_role',false);
SELECT public.native_security_append_privileged_event('00000000-0000-4000-8000-000000000001','admin.role.created','00000000-0000-4000-8000-000000000002',null,null,repeat('a',64),ARRAY['modules']);
SELECT public.native_security_append_privileged_event('00000000-0000-4000-8000-000000000001','admin.role.deleted','00000000-0000-4000-8000-000000000002',null,null,repeat('b',64),ARRAY['label']);
DO $$ BEGIN
 BEGIN PERFORM public.native_security_append_privileged_event(gen_random_uuid(),'admin.role.created',gen_random_uuid(),null,null,null,ARRAY['password']); RAISE EXCEPTION 'SECRET_FIELD_ALLOWED'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN UPDATE public.native_security_privileged_events SET action='admin.role.deleted'; RAISE EXCEPTION 'AUDIT_MUTABLE'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN DELETE FROM public.native_security_privileged_events; RAISE EXCEPTION 'AUDIT_DELETABLE'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM count(*) FROM public.native_security_privileged_events; RAISE EXCEPTION 'SERVICE_READ_ALLOWED'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
DO $$ BEGIN IF (SELECT count(*)=1 AND bool_and(action='admin.role.created') FROM public.native_security_privileged_events) IS NOT TRUE THEN RAISE EXCEPTION 'IDEMPOTENCY_OR_EVIDENCE_CHANGED'; END IF; END $$;
\i docs/releases/security-operations/privileged-audit-rollback.sql
DO $$ BEGIN IF has_function_privilege('service_role','public.native_security_append_privileged_event(uuid,text,uuid,uuid,uuid,text,text[])','EXECUTE') THEN RAISE EXCEPTION 'ROLLBACK_FAILED'; END IF; IF (SELECT count(*) FROM public.native_security_privileged_events)<>1 THEN RAISE EXCEPTION 'ROLLBACK_DESTROYED_EVIDENCE'; END IF; END $$;
SELECT 'PRIVILEGED_AUDIT_ISOLATED_PASS';
