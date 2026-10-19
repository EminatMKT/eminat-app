#!/usr/bin/env python3
"""Read-only capability check for the narrow one-time staff binding login."""

import json
import os
import subprocess
import sys

from sales_migration_common import connection_environment

SQL = """
SELECT json_build_object(
  'database', current_database()='postgres',
  'publicUsage', has_schema_privilege(current_user,'public','USAGE'),
  'historyUsage', has_schema_privilege(current_user,'supabase_migrations','USAGE'),
  'historyRead', has_table_privilege(current_user,'supabase_migrations.schema_migrations','SELECT'),
  'identityRead', has_table_privilege(current_user,'public.usuarios','SELECT'),
  'companyRead', has_table_privilege(current_user,'public.empresas','SELECT'),
  'orgRead', has_table_privilege(current_user,'public.sales_organizations','SELECT'),
  'orgInsert', has_table_privilege(current_user,'public.sales_organizations','INSERT'),
  'memberRead', has_table_privilege(current_user,'public.sales_members','SELECT'),
  'memberInsert', has_table_privilege(current_user,'public.sales_members','INSERT'),
  'publicCreate', has_schema_privilege(current_user,'public','CREATE'),
  'superuser', (SELECT rolsuper FROM pg_roles WHERE rolname=current_user)
)
"""


def main() -> None:
    env = connection_environment(os.environ.get('LILLY_SALES_STAFF_DB_URL', ''))
    env['PGOPTIONS'] = '-c default_transaction_read_only=on -c statement_timeout=30000'
    result = subprocess.run(
        ['psql', '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-c', SQL],
        env=env, capture_output=True, text=True, check=False,
    )
    if result.returncode:
        raise ValueError('STAFF_CAPABILITY_QUERY_FAILED')
    try:
        state = json.loads(result.stdout.strip())
    except (ValueError, TypeError):
        raise ValueError('STAFF_CAPABILITY_RESPONSE_INVALID') from None
    required = ('database', 'publicUsage', 'historyUsage', 'historyRead',
                'identityRead', 'companyRead', 'orgRead', 'orgInsert',
                'memberRead', 'memberInsert')
    if any(state.get(key) is not True for key in required) or \
            state.get('publicCreate') is not False or state.get('superuser') is not False:
        raise ValueError('STAFF_CAPABILITY_SCOPE_INVALID')
    print('NATIVE_STAFF_CAPABILITY_PASS')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError):
        print('NATIVE_STAFF_CAPABILITY_FAILED', file=sys.stderr)
        sys.exit(1)
