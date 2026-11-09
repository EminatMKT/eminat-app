#!/usr/bin/env python3
"""Private metadata-only audit addition; never reads business/audit event rows."""
import hashlib,json,os,subprocess,sys
from pathlib import Path
from sales_migration_common import connection_environment
folder=Path(__file__).resolve().parents[2]/'docs/releases/security-operations'
evidence=json.loads((folder/'privileged-audit-isolated-evidence.json').read_text())
assert evidence['result']=='PASS' and evidence['productionDataUsed'] is False
assert evidence['proposalSha256']==hashlib.sha256((folder/'privileged-audit-proposal.sql').read_bytes()).hexdigest()
phase=sys.argv[1]; assert phase in ('check','apply','verify')
env=connection_environment(os.environ.get('LILLY_SALES_SCHEMA_ADMIN_DB_URL',''))
env['PGOPTIONS']='-c statement_timeout=30000 -c lock_timeout=5000'
def sql(q):
 p=subprocess.run(['psql','-X','-q','-t','-A','-v','ON_ERROR_STOP=1'],input=q,env=env,capture_output=True,text=True)
 if p.returncode: raise RuntimeError('PRIVILEGED_AUDIT_SCHEMA_OPERATION_FAILED')
 return p.stdout.strip()
exists=json.loads(sql("BEGIN READ ONLY; SELECT json_build_object('table',to_regclass('public.native_security_privileged_events') IS NOT NULL,'function',to_regprocedure('public.native_security_append_privileged_event(uuid,text,uuid,uuid,uuid,text,text[])') IS NOT NULL); ROLLBACK;"))
if phase in ('check','apply'):
 assert exists=={'table':False,'function':False},'EXPECTED_NEW_OBJECTS_ONLY'
 if phase=='apply':
  assert os.environ.get('APPROVED_EXACT_COMMIT')==os.environ.get('GITHUB_SHA'),'EXACT_COMMIT_REQUIRED'
  sql((folder/'privileged-audit-proposal.sql').read_text())
else:
 assert all(exists.values())
 q="""SELECT json_build_object('rls',c.relrowsecurity,'policies',(SELECT count(*) FROM pg_policy WHERE polrelid=c.oid),'realtime',(SELECT count(*) FROM pg_publication_tables WHERE schemaname='public' AND tablename=c.relname),'table_acl',(SELECT bool_and(NOT has_table_privilege(r,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')) FROM unnest(ARRAY['anon','authenticated','service_role']) r),'function_sha256',encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex'),'definer',p.prosecdef,'config',p.proconfig,'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'),'service_execute',has_function_privilege('service_role',p.oid,'EXECUTE')) FROM pg_class c CROSS JOIN pg_proc p WHERE c.oid='public.native_security_privileged_events'::regclass AND p.oid='public.native_security_append_privileged_event(uuid,text,uuid,uuid,uuid,text,text[])'::regprocedure;"""
 v=json.loads(sql('BEGIN READ ONLY;'+q+'ROLLBACK;'))
 assert v['rls'] and v['policies']==0 and v['realtime']==0 and v['table_acl']
 assert v['definer'] and v['config']==['search_path=public, pg_temp']
 assert v['service_execute'] and not v['anon_execute'] and not v['authenticated_execute']
 assert v['function_sha256']==evidence['functionSha256']
print('PRIVILEGED_AUDIT_SCHEMA_'+phase.upper()+'_PASS')
