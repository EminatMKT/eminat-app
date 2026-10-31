#!/usr/bin/env python3
"""Run actual Native Sales/Social DDL and Phase 1 integration/down checks in a temporary
PostgreSQL 17 cluster. UNIX socket only; no existing database or credentials used."""
from pathlib import Path
import os,shutil,subprocess,tempfile
ROOT=Path(__file__).resolve().parents[2]
PG=Path(os.environ.get('META_TEST_PG_BIN','/opt/homebrew/opt/postgresql@17/bin'))
if not (PG/'initdb').exists():
    found=shutil.which('initdb')
    if not found: raise SystemExit('Set META_TEST_PG_BIN to local PostgreSQL binaries')
    PG=Path(found).parent
TEMP=Path(tempfile.mkdtemp(prefix='lilly-meta-phase1-'))
SOCKET=TEMP/'socket';SOCKET.mkdir(mode=0o700)
DATA=TEMP/'data'
def run(args):
    result=subprocess.run([str(a) for a in args],text=True,capture_output=True)
    if result.returncode: raise RuntimeError(result.stdout+result.stderr)
    return result.stdout
run([PG/'initdb','-D',DATA,'-A','trust','--no-locale','--encoding=UTF8'])
started=False
try:
    run([PG/'pg_ctl','-D',DATA,'-l',TEMP/'postgres.log','-o',f"-k {SOCKET} -h '' -p 56439",'-w','start']);started=True
    args=[PG/'psql','-h',SOCKET,'-p','56439','-d','postgres','-X','-v','ON_ERROR_STOP=1']
    boot="""CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claim.role',true) $$;
    CREATE TABLE public.usuarios(id uuid PRIMARY KEY,auth_id uuid,email text,nombre text,apellido text,rol text,validado boolean,activo boolean);
    CREATE TABLE public.empresas(codigo text PRIMARY KEY,nombre text,activo boolean);
    """
    migrations=ROOT/'supabase/migrations'
    names=['20261018000000_native_sales_core.sql','20261018010000_native_sales_operations.sql',
      '20261018020000_native_sales_lead_rules.sql','20261018030000_native_sales_social.sql',
      '20261019110000_native_sales_social_receive.sql','20261019130000_native_sales_social_retry_worker.sql',
      '20261019140000_native_sales_social_oauth_state.sql']
    boot+='\n'.join((migrations/n).read_text() for n in names)
    source=(migrations/'20261005090000_lilly_access_foundation.sql').read_text()
    boot+='\n'+source[source.index('CREATE TABLE public.usuario_empresas_acceso'):source.index('CREATE POLICY usuario_empresas_acceso_read')]
    (TEMP/'bootstrap.sql').write_text(boot)
    run(args+['-q','-f',TEMP/'bootstrap.sql'])
    fingerprint="SELECT md5(string_agg(pg_get_functiondef(oid)||coalesce(proacl::text,''),'' ORDER BY proname)) FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('native_sales_receive_social_event','native_sales_retry_social_lead','native_sales_claim_social_leads','native_sales_complete_meta_page','native_sales_refresh_meta_connection','native_sales_revoke_meta_connection','native_sales_mark_meta_page_subscribed')"
    before=run(args+['-At','-c',fingerprint])
    run(args+['-q','-f',migrations/'20261031190000_meta_connection_management.sql'])
    run(args+['-q','-f',ROOT/'supabase/checks/native-sales-social-rehearsal.sql'])
    run(args+['-q','-f',ROOT/'scripts/migration/rollback_meta_connection_management.sql'])
    if before!=run(args+['-At','-c',fingerprint]): raise RuntimeError('RPC definitions/ACL rollback mismatch')
    run(args+['-q','-f',migrations/'20261031190000_meta_connection_management.sql'])
    print('PASS: actual Sales/Social DDL; synthetic tenant/company/OAuth/multi-asset/lifecycle/ingestion denials; clean rollback RPC+ACL fingerprint; reapply.')
    print('Scope: local PostgreSQL only. Auth/usuarios/empresas bootstrap is synthetic; full migration chain remains a CI gate.')
finally:
    if started: run([PG/'pg_ctl','-D',DATA,'-m','fast','-w','stop'])
