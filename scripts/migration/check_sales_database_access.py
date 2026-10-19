#!/usr/bin/env python3
"""Read-only Production capability gate for the two Native Sales DB principals."""

import argparse
import json
import os
import subprocess
import sys

from sales_migration_common import TABLES, connection_environment


def capability_sql(phase: str) -> str:
    tables = ",".join("'" + table + "'" for table in TABLES)
    common = """
      SELECT json_build_object(
        'production', current_database() = 'postgres',
        'migrationHistory', has_table_privilege(current_user,
          'supabase_migrations.schema_migrations', 'SELECT'),
        'identityRead', has_table_privilege(current_user, 'public.usuarios', 'SELECT'),
        'superuser', r.rolsuper,
        'createRole', r.rolcreaterole,
        'createDb', r.rolcreatedb,
        'bypassRls', r.rolbypassrls,
        'publicCreate', has_schema_privilege(current_user, 'public', 'CREATE'),
        'usuariosOwner', pg_has_role(current_user::regrole,
          (SELECT relowner FROM pg_class WHERE oid='public.usuarios'::regclass), 'USAGE'),
        'unrelatedWrite', EXISTS (
          SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE n.nspname='public' AND c.relkind IN ('r','p')
            AND c.relname NOT IN (__TABLES__)
            AND (has_table_privilege(current_user,c.oid,'INSERT')
              OR has_table_privilege(current_user,c.oid,'UPDATE')
              OR has_table_privilege(current_user,c.oid,'DELETE'))),
        'targetCount', (SELECT count(*) FROM pg_class c JOIN pg_namespace n
          ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN (__TABLES__)
          AND c.relkind IN ('r','p')),
        'targetRights', (SELECT count(*) FROM pg_class c JOIN pg_namespace n
          ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN (__TABLES__)
          AND c.relkind IN ('r','p')
          AND has_table_privilege(current_user,c.oid,'SELECT')
          AND has_table_privilege(current_user,c.oid,'INSERT')
          AND has_table_privilege(current_user,c.oid,'UPDATE')
          AND NOT has_table_privilege(current_user,c.oid,'DELETE'))
      ) FROM pg_roles r WHERE r.rolname=current_user
    """.replace("__TABLES__", tables)
    return common


def validate_capabilities(state: dict, phase: str) -> None:
    if state.get('production') is not True or state.get('migrationHistory') is not True or \
            state.get('identityRead') is not True:
        raise ValueError('PRODUCTION_CAPABILITY_REQUIRED')
    if phase == 'schema':
        if state.get('usuariosOwner') is not True or state.get('publicCreate') is not True:
            raise ValueError('SCHEMA_OWNER_CAPABILITY_REQUIRED')
    elif not (state.get('superuser') is False and state.get('createRole') is False and
              state.get('createDb') is False and state.get('bypassRls') is False and
              state.get('publicCreate') is False and state.get('usuariosOwner') is False and
              state.get('unrelatedWrite') is False and state.get('targetCount') == len(TABLES) and
              state.get('targetRights') == len(TABLES)):
        raise ValueError('LIMITED_IMPORT_CAPABILITY_REQUIRED')


def assert_database_capabilities(env: dict[str, str], phase: str) -> None:
    check_env = dict(env)
    check_env['PGOPTIONS'] = '-c default_transaction_read_only=on -c statement_timeout=30000'
    result = subprocess.run(['psql', '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1',
                             '-c', capability_sql(phase)], env=check_env,
                            capture_output=True, text=True, check=False)
    if result.returncode:
        raise ValueError('CAPABILITY_QUERY_FAILED')
    try:
        state = json.loads(result.stdout.strip())
    except (ValueError, TypeError):
        raise ValueError('CAPABILITY_RESPONSE_INVALID') from None
    validate_capabilities(state, phase)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--phase', choices=('schema', 'data'), required=True)
    args = parser.parse_args()
    secret = ('LILLY_SALES_SCHEMA_ADMIN_DB_URL' if args.phase == 'schema'
              else 'LILLY_SALES_PRODUCTION_DB_URL')
    env = connection_environment(os.environ.get(secret, ''))
    assert_database_capabilities(env, args.phase)
    print('SALES_' + args.phase.upper() + '_CAPABILITY_PASS')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError):
        print('SALES_DATABASE_CAPABILITY_FAILED', file=sys.stderr)
        sys.exit(1)
