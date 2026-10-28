#!/usr/bin/env python3
"""Exact reviewed attendance correction, schema only; never reads personnel records."""
import hashlib,json,os,subprocess,sys
from pathlib import Path
from sales_migration_common import connection_environment
root=Path(__file__).resolve().parents[2]
folder=root/'docs/releases/security-closure'
evidence=json.loads((folder/'attendance-isolated-evidence.json').read_text())
assert evidence['result']=='PASS' and evidence['productionDataUsed'] is False
assert evidence['proposalSha256']==hashlib.sha256((folder/'attendance-proposal.sql').read_bytes()).hexdigest()
phase=sys.argv[1]
assert phase in ('check','apply','verify')
env=connection_environment(os.environ.get('LILLY_SALES_SCHEMA_ADMIN_DB_URL',''))
env['PGOPTIONS']='-c statement_timeout=30000 -c lock_timeout=5000'
def sql(q):
 p=subprocess.run(['psql','-X','-q','-t','-A','-v','ON_ERROR_STOP=1'],input=q,env=env,capture_output=True,text=True)
 if p.returncode: raise RuntimeError('ATTENDANCE_SCHEMA_OPERATION_FAILED')
 return p.stdout.strip()
q="""SELECT json_agg(json_build_object('name',p.oid::regprocedure::text,'definition',pg_get_functiondef(p.oid),'anon',has_function_privilege('anon',p.oid,'EXECUTE'),'authenticated',has_function_privilege('authenticated',p.oid,'EXECUTE'))) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('registrar_entrada','registrar_salida');"""
rows=json.loads(sql('BEGIN READ ONLY;'+q+'ROLLBACK;'))
assert len(rows)==2
if phase in ('check','apply'):
 expected=json.loads((folder/'attendance-expected.json').read_text())
 assert {v['name']:hashlib.sha256(v['definition'].encode()).hexdigest() for v in rows}==expected,'PRODUCTION_DEFINITION_CHANGED'
 assert all(v['anon'] and v['authenticated'] for v in rows),'PRODUCTION_ACL_CHANGED'
 if phase=='apply':
  assert os.environ.get('APPROVED_EXACT_COMMIT')==os.environ.get('GITHUB_SHA'),'EXACT_COMMIT_REQUIRED'
  sql((folder/'attendance-proposal.sql').read_text())
else:
 for v in rows:
  assert not v['anon'] and v['authenticated']
  assert 'ATTENDANCE_ACCESS_DENIED' in v['definition']
  assert 'SET search_path TO' in v['definition'] and 'pg_temp' in v['definition']
  assert 'u.auth_id = auth.uid()' in v['definition']
print('ATTENDANCE_SCHEMA_'+phase.upper()+'_PASS')
