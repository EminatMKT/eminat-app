#!/usr/bin/env python3
"""Read-only capability gate for the Native Sales schema owner."""

import json
import os
import subprocess
import sys

from sales_migration_common import connection_environment


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


def main() -> None:
    env = connection_environment(os.environ.get('LILLY_SALES_SCHEMA_ADMIN_DB_URL', ''))
    check_env = dict(env)
    check_env['PGOPTIONS'] = '-c default_transaction_read_only=on -c statement_timeout=30000'
    result = subprocess.run(['psql', '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1',
                             '-c', SQL], env=check_env, capture_output=True,
                            text=True, check=False)
    if result.returncode:
        raise ValueError('CAPABILITY_QUERY_FAILED')
    try:
        state = json.loads(result.stdout.strip())
    except (ValueError, TypeError):
        raise ValueError('CAPABILITY_RESPONSE_INVALID') from None
    if any(state.get(key) is not True for key in
           ('production', 'migrationHistory', 'identityRead', 'authRead',
            'usuariosOwner', 'publicCreate')):
        raise ValueError('SCHEMA_OWNER_CAPABILITY_REQUIRED')
    print('SALES_SCHEMA_CAPABILITY_PASS')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError):
        print('SALES_DATABASE_CAPABILITY_FAILED', file=sys.stderr)
        sys.exit(1)
