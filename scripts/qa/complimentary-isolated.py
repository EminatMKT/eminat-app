#!/usr/bin/env python3
"""Synthetic integration tests in a new UNIX-socket-only PostgreSQL 17 cluster.
No URL, external credentials, existing databases, DNS or network calls are accepted.
"""
from pathlib import Path
import os,shutil,subprocess,tempfile,concurrent.futures,uuid,threading
ROOT=Path(__file__).resolve().parents[2]
PG=Path('/opt/homebrew/opt/postgresql@17/bin')
if not (PG/'initdb').exists():
 binary=shutil.which('initdb')
 if not binary: raise SystemExit('Local PostgreSQL 17 binaries required')
 PG=Path(binary).parent
TEMP=Path(tempfile.mkdtemp(prefix='lilly-complimentary-'))
SOCKET=TEMP/'socket';SOCKET.mkdir(mode=0o700)
DATA=TEMP/'data'
def run(args,check=True):
 p=subprocess.run([str(x) for x in args],text=True,capture_output=True)
 if check and p.returncode:raise RuntimeError(p.stdout+p.stderr)
 return p
started=False
try:
 run([PG/'initdb','-D',DATA,'-A','trust','--no-locale','--encoding=UTF8','-c','shared_memory_type=mmap','-c','dynamic_shared_memory_type=mmap'])
 run([PG/'pg_ctl','-D',DATA,'-l',TEMP/'postgres.log','-o',f"-k {SOCKET} -h '' -p 56441",'-w','start']);started=True
 args=[PG/'psql','-h',SOCKET,'-p','56441','-d','postgres','-X','-v','ON_ERROR_STOP=1']
 def sql(query,check=True):return run(args+['-At','-c',query],check)
 boot='''CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean); CREATE TABLE storage.objects(bucket_id text);
 CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz,banned_until timestamptz,deleted_at timestamptz,raw_user_meta_data jsonb DEFAULT '{}'::jsonb);
 CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claim.role',true) $$;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 CREATE TABLE public.usuarios(id uuid PRIMARY KEY,auth_id uuid,email text,nombre text,apellido text,nombre_display text,rol text,validado boolean,activo boolean,empresa_id uuid);
 CREATE TABLE public.empresas(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),codigo text UNIQUE,nombre text,color text NOT NULL DEFAULT 'blue',activo boolean);
 '''
 (TEMP/'bootstrap.sql').write_text(boot);run(args+['-q','-f',TEMP/'bootstrap.sql'])
 files=sorted(p for p in (ROOT/'supabase/migrations').glob('*.sql') if '20261018000000'<=p.name[:14]<='20261027120000')
 for p in files:
  print('BASELINE',p.name,flush=True)
  run(args+['-q','-f',p])
 migration=ROOT/'supabase/migrations/20261123000000_complimentary_memberships.sql'
 run(args+['-q','-f',ROOT/'supabase/prechecks'/migration.name])
 run(args+['-q','-f',migration])
 run(args+['-q','-f',ROOT/'supabase/checks/complimentary-memberships.sql'])
 run(args+['-q','-f',ROOT/'supabase/rollback'/migration.name])
 run(args+['-q','-f',migration])
 print('PASS migration, empty rollback, reapply and ACLs',flush=True)
 for filename in ['native-sales-online-renewal.sql','native-sales-family-expansion.sql','native-sales-membership-email-preference.sql','native-sales-patient-staff-onboarding.sql']:
  run(args+['-q','-f',ROOT/'supabase/checks'/filename]);print('PASS paid regression',filename,flush=True)
 run(args+['-q','-f',ROOT/'scripts/qa/complimentary-paid-compatibility.sql']);print('PASS paid/courtesy coexistence, paid-row immutability and separate sales reporting',flush=True)
 fixture=ROOT/'scripts/qa/complimentary-functional.sql'
 if fixture.exists():run(args+['-q','-f',fixture]);print('PASS functional SQL',flush=True)
 hardening=ROOT/'supabase/migrations/20261123010000_complimentary_hardening.sql'
 run(args+['-q','-f',ROOT/'supabase/prechecks'/hardening.name])
 run(args+['-q','-f',hardening])
 run(args+['-q','-f',ROOT/'supabase/rollback'/hardening.name])
 run(args+['-q','-f',hardening])
 run(args+['-q','-f',ROOT/'scripts/qa/complimentary-hardening.sql'])
 print('PASS hardening migration, empty rollback/reapply, policy block and audited reactivation',flush=True)
 # Real independent database sessions race the exact same one-use authorization.
 ids=[str(uuid.uuid4()) for _ in range(6)]
 au,usr,org,actor,contact,patient=ids
 sql(f"""SET request.jwt.claim.role='service_role';
 INSERT INTO auth.users(id) VALUES('{au}');
 INSERT INTO auth.users(id,email,email_confirmed_at) VALUES('{patient}','race@example.invalid',now());
 INSERT INTO usuarios(id,auth_id,email,rol,activo,validado) VALUES('{usr}','{au}','race-admin@example.invalid','admin',true,true);
 INSERT INTO sales_organizations(id,code,name,status,approved_by,approved_at) VALUES('{org}','qa-race','QA Race','active','{usr}',now());
 INSERT INTO sales_members(id,organization_id,user_id,auth_id,role,status,evidence_ref,approved_by,approved_at) VALUES('{actor}','{org}','{usr}','{au}','SUPERADMIN','active','isolated race','{usr}',now());
 INSERT INTO sales_contacts(id,organization_id,owner_member_id,display_name,first_name,last_name,email,created_by,updated_by) VALUES('{contact}','{org}','{actor}','QA Race','QA','Race','race@example.invalid','{actor}','{actor}');
 SELECT native_sales_complimentary_configure('{org}','{actor}','America/New_York',ARRAY[30,7,1],true);
 SELECT native_sales_complimentary_issue('{org}','{actor}',gen_random_uuid(),repeat('1',64),'PLUS',6,'Race','{contact}',NULL,'REDEMPTION_CODE',repeat('9',64),now()-interval '1 hour',now()+interval '1 day');""")
 barrier=threading.Barrier(2)
 def race(digest):
  barrier.wait()
  return sql(f"SET request.jwt.claim.role='service_role'; SELECT native_sales_complimentary_redeem('{org}','{patient}',repeat('{digest}',64),false);",False)
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  results=list(pool.map(race,['9','9']))
 assert sum(p.returncode==0 for p in results)==1,[(p.stdout,p.stderr) for p in results]
 assert any('COMPLIMENTARY_CODE_UNAVAILABLE' in p.stderr for p in results)
 assert sql(f"SELECT count(*) FROM sales_memberships WHERE organization_id='{org}'").stdout.strip()=='1'
 print('PASS simultaneous redemption in two real PostgreSQL sessions: one winner, one rejection',flush=True)
 # A rollback with real benefit history must fail and preserve coverage and audit.
 blocked=run(args+['-q','-f',ROOT/'supabase/rollback'/migration.name],False)
 assert blocked.returncode!=0 and 'POPULATED_HISTORY_REQUIRES_FORWARD_REPAIR' in blocked.stderr
 print('PASS populated rollback refused; history retained',flush=True)
 sql(f"SET request.jwt.claim.role='service_role'; SELECT native_sales_complimentary_custom_request('{org}','{actor}',gen_random_uuid(),'MAX',5,current_date+150,'Persistent synthetic policy request','{contact}');")
 blocked=run(args+['-q','-f',ROOT/'supabase/rollback'/hardening.name],False)
 assert blocked.returncode!=0 and 'HARDENING_HISTORY_REQUIRES_FORWARD_REPAIR' in blocked.stderr
 print('PASS hardening populated rollback refused; policy audit retained',flush=True)
 print('LOCAL ONLY: synthetic auth/profile bootstrap; no GoTrue, PostgREST, browser or staging certification.',flush=True)
finally:
 if started:run([PG/'pg_ctl','-D',DATA,'-m','fast','-w','stop'])
 shutil.rmtree(TEMP)
