#!/usr/bin/env python3
"""Exact Medical ACL gate. Catalogs and counts only; never selects clinical values."""
import hashlib,json,os,re,subprocess,sys
from pathlib import Path
from sales_migration_common import connection_environment
VERSION='20261029150000'
ROOT=Path(__file__).resolve().parents[2]
MIGRATION=ROOT/'supabase/migrations/20261029150000_medical_registry_grants.sql'
TABLES=('pacientes','paciente_fuentes','paciente_contactos')
PRIVILEGES=('SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER')
TARGETS="'pacientes','paciente_fuentes','paciente_contactos'"
def validate_catalog(catalog,after=False):
    assert set(catalog)==set(TABLES),'MEDICAL_TABLE_SET_MISMATCH'
    for table in catalog.values():
        assert table['rls'] and table['policies']==1 and table['rows']==0,'MEDICAL_BASELINE_CHANGED'
        assert table['policy']=="( SELECT has_module('medical'::text) AS has_module)",'MEDICAL_POLICY_CHANGED'
        for privilege in PRIVILEGES:
            assert table['service_role'][privilege],'SERVICE_PRIVILEGE_CHANGED'
            assert table['anon'][privilege] is (not after),'ANON_ACL_MISMATCH'
            assert table['authenticated'][privilege] is (not after or privilege in PRIVILEGES[:4]),'AUTHENTICATED_ACL_MISMATCH'
def main():
    phase=sys.argv[1];assert phase in ('check','verify')
    env=connection_environment(os.environ.get('LILLY_SALES_SCHEMA_ADMIN_DB_URL',''))
    env['PGOPTIONS']='-c default_transaction_read_only=on -c statement_timeout=30000 -c lock_timeout=5000'
    def sql(query):
        result=subprocess.run(['psql','-X','-qAt','-v','ON_ERROR_STOP=1'],input='BEGIN READ ONLY;'+query+'ROLLBACK;',env=env,text=True,capture_output=True)
        if result.returncode:raise ValueError('MEDICAL_CATALOG_QUERY_FAILED')
        return json.loads(result.stdout.strip())
    result={}
    for table in TABLES:
        grants=','.join(f"'{role}',(SELECT jsonb_object_agg(p,has_table_privilege('{role}','public.{table}',p)) FROM unnest(ARRAY[{','.join(repr(p) for p in PRIVILEGES)}]) p)" for role in ('anon','authenticated','service_role'))
        result[table]=sql(f"SELECT jsonb_build_object('rls',(SELECT relrowsecurity FROM pg_class WHERE oid='public.{table}'::regclass),'policies',(SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='{table}'),'policy',(SELECT qual FROM pg_policies WHERE schemaname='public' AND tablename='{table}' AND policyname='mod_access'),'rows',(SELECT count(*) FROM public.{table}),{grants});")
    validate_catalog(result,phase=='verify')
    history=sql('SELECT coalesce(jsonb_agg(version),\'[]\'::jsonb) FROM supabase_migrations.schema_migrations;')
    local={p.name[:14] for p in (ROOT/'supabase/migrations').glob('*.sql')}
    pending=local-set(history)
    assert pending==({VERSION} if phase=='check' else set()),'UNEXPECTED_PENDING_MIGRATIONS'
    fingerprint=sql(f"SELECT to_jsonb(md5(string_agg(v,E'\\n' ORDER BY v))) FROM (SELECT 'table:'||c.relname||':'||coalesce(c.relacl::text,'')||':'||c.relrowsecurity::text AS v FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname NOT IN ({TARGETS}) UNION ALL SELECT 'policy:'||tablename||':'||policyname||':'||coalesce(qual,'')||':'||coalesce(with_check,'') FROM pg_policies WHERE schemaname='public' UNION ALL SELECT 'function:'||p.oid::regprocedure::text||':'||pg_get_functiondef(p.oid)||':'||coalesce(p.proacl::text,'') FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind IN ('f','p')) s;")
    expected=os.environ.get('EXPECTED_REFERENCE')
    if phase=='verify':assert expected and fingerprint==expected,'UNRELATED_SCHEMA_CHANGED'
    print(json.dumps({'status':'PASS','phase':phase,'reference':fingerprint,'migration_sha256':hashlib.sha256(MIGRATION.read_bytes()).hexdigest(),'medical_rows':0}))
if __name__=='__main__':
    try:main()
    except (AssertionError,ValueError,OSError):
        print('MEDICAL_GRANTS_GATE_FAILED',file=sys.stderr);sys.exit(1)
