#!/usr/bin/env python3
"""Read-only capability gate for the Native Sales schema owner."""

import json
import os
import subprocess
import sys
from urllib.parse import unquote, urlparse

from sales_migration_common import PROJECT_REF, connection_environment


SQL = """
SELECT json_build_object(
  'production', current_database() = 'postgres',
  'migrationHistory', has_table_privilege(current_user,
    'supabase_migrations.schema_migrations', 'SELECT'),
  'identityRead', has_table_privilege(current_user, 'public.usuarios', 'SELECT'),
  'authRead', has_table_privilege(current_user, 'auth.users', 'SELECT'),
  'usuariosOwner', pg_has_role(current_user::regrole,
    (SELECT relowner FROM pg_class WHERE oid='public.usuarios'::regclass), 'USAGE'),
  'publicCreate', has_schema_privilege(current_user, 'public', 'CREATE')
)
"""


def connection_shape(url: str) -> None:
    """Print only non-secret URL classifications for the protected check log."""
    parsed = urlparse(url)
    host = parsed.hostname or ''
    user = unquote(parsed.username or '')
    try:
        port = parsed.port or 5432
    except ValueError:
        port = None
    direct = host == f'db.{PROJECT_REF}.supabase.co'
    pooler = host.endswith('.pooler.supabase.com')
    kind = 'DIRECT' if direct else 'SESSION_POOLER' if pooler and port == 5432 else 'INVALID'
    print(f'SALES_DB_CONNECTION_TYPE={kind}', flush=True)
    print(f'SALES_DB_SCHEME_VALID={parsed.scheme in ("postgres", "postgresql")}', flush=True)
    print(f'SALES_DB_HOST_VALID={direct or pooler}', flush=True)
    print(f'SALES_DB_PORT_5432={port == 5432}', flush=True)
    print(f'SALES_DB_DATABASE_POSTGRES={parsed.path == "/postgres"}', flush=True)
    print(f'SALES_DB_USERNAME_FORMAT_VALID={user == "postgres" if direct else user == f"postgres.{PROJECT_REF}" if pooler else False}', flush=True)
    print(f'SALES_DB_NO_EXTRA_PARAMETERS={not parsed.query and not parsed.fragment}', flush=True)


def safe_connection_error(stderr: str) -> str:
    """Classify libpq failures without echoing its potentially sensitive output."""
    message = stderr.lower()
    if 'password authentication failed' in message or 'authentication failed' in message:
        return 'AUTHENTICATION_FAILED'
    if 'certificate verify failed' in message or 'root certificate' in message or 'ssl error' in message:
        return 'SSL_FAILED'
    if 'could not translate host name' in message or 'name or service not known' in message:
        return 'HOST_DNS_FAILED'
    if 'network is unreachable' in message or 'no route to host' in message or 'timeout expired' in message:
        return 'HOST_NETWORK_FAILED'
    if 'permission denied' in message:
        return 'QUERY_PERMISSION_DENIED'
    if 'does not exist' in message:
        return 'QUERY_OBJECT_MISSING'
    return 'CONNECTION_OR_QUERY_FAILED'


def main() -> None:
    url = os.environ.get('LILLY_SALES_SCHEMA_ADMIN_DB_URL', '')
    connection_shape(url)
    env = connection_environment(url)
    check_env = dict(env)
    check_env['PGOPTIONS'] = '-c default_transaction_read_only=on -c statement_timeout=30000'
    result = subprocess.run(['psql', '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1',
                             '-c', SQL], env=check_env, capture_output=True,
                            text=True, check=False)
    if result.returncode:
        raise ValueError(safe_connection_error(result.stderr))
    try:
        state = json.loads(result.stdout.strip())
    except (ValueError, TypeError):
        raise ValueError('CAPABILITY_RESPONSE_INVALID') from None
    missing = [key for key in ('production', 'migrationHistory', 'identityRead',
                               'authRead', 'usuariosOwner', 'publicCreate')
               if state.get(key) is not True]
    if missing:
        print('SALES_DB_CAPABILITY_MISSING=' + ','.join(missing), flush=True)
        raise ValueError('SCHEMA_OWNER_CAPABILITY_REQUIRED')
    print('SALES_SCHEMA_CAPABILITY_PASS')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError) as exc:
        allowed = {'PRODUCTION_ENVIRONMENT_REQUIRED', 'PRIVATE_DATABASE_HANDOFF_INVALID',
                   'PRODUCTION_DATABASE_REQUIRED', 'PRODUCTION_PROJECT_MISMATCH',
                   'AUTHENTICATION_FAILED', 'SSL_FAILED', 'HOST_DNS_FAILED',
                   'HOST_NETWORK_FAILED', 'QUERY_PERMISSION_DENIED', 'QUERY_OBJECT_MISSING',
                   'CONNECTION_OR_QUERY_FAILED', 'CAPABILITY_RESPONSE_INVALID',
                   'SCHEMA_OWNER_CAPABILITY_REQUIRED'}
        code = str(exc) if str(exc) in allowed else 'LOCAL_CHECK_FAILED'
        print('SALES_DATABASE_DIAGNOSTIC=' + code, file=sys.stderr)
        print('SALES_DATABASE_CAPABILITY_FAILED', file=sys.stderr)
        sys.exit(1)
