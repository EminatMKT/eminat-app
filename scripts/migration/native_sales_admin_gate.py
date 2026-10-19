#!/usr/bin/env python3
"""Exact, owner-approved Native Sales admin binding. Never print row data."""

import argparse
import os
from pathlib import Path
import subprocess
import sys

from sales_migration_common import connection_environment

SCRIPT = Path(__file__).with_name('bootstrap-native-sales-admin.sql')
IDENTITY = """
SELECT CASE WHEN count(*)=1 THEN 'PASS' ELSE 'FAIL' END
FROM public.usuarios u
JOIN auth.users a ON a.id=u.auth_id
JOIN public.empresas e ON e.codigo='STRATIX' AND e.activo=true
WHERE u.id='2344e112-76ef-42a8-ac56-7c488084e0f5'::uuid
  AND u.auth_id='3b1d0b87-083e-46ef-b7e1-1cd662360085'::uuid
  AND lower(u.email)='freddy@eminat.net'
  AND lower(a.email)='freddy@eminat.net'
  AND u.rol='admin' AND u.activo=true;
"""
VERIFY = """
SELECT CASE WHEN count(*)=1 THEN 'PASS' ELSE 'FAIL' END
FROM public.sales_members s
JOIN public.sales_organizations o ON o.id=s.organization_id
WHERE s.user_id='2344e112-76ef-42a8-ac56-7c488084e0f5'::uuid
  AND s.auth_id='3b1d0b87-083e-46ef-b7e1-1cd662360085'::uuid
  AND o.code='stratix' AND o.status='active'
  AND s.role='SUPERADMIN' AND s.status='active';
"""


def run(env: dict[str, str], *, sql: str | None = None, file: Path | None = None,
        read_only: bool = True) -> str:
    args = ['psql', '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1']
    args += ['--single-transaction', '-f', str(file)] if file else ['-c', sql or '']
    pg_env = dict(env)
    pg_env['PGOPTIONS'] = '-c statement_timeout=30000' + \
        (' -c default_transaction_read_only=on' if read_only else '')
    result = subprocess.run(args, env=pg_env, capture_output=True, text=True, check=False)
    if result.returncode:
        raise ValueError('NATIVE_ADMIN_SQL_FAILED')
    return result.stdout.strip()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--phase', choices=('check', 'apply', 'verify'), required=True)
    phase = parser.parse_args().phase
    env = connection_environment(os.environ.get('LILLY_SALES_SCHEMA_ADMIN_DB_URL', ''))
    if run(env, sql=IDENTITY) != 'PASS':
        raise ValueError('NATIVE_ADMIN_IDENTITY_CHANGED')
    if phase == 'apply':
        run(env, file=SCRIPT, read_only=False)
    if phase in ('apply', 'verify') and run(env, sql=VERIFY) != 'PASS':
        raise ValueError('NATIVE_ADMIN_BINDING_NOT_VERIFIED')
    print('NATIVE_ADMIN_' + phase.upper() + '_PASS')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError):
        print('NATIVE_ADMIN_GATE_FAILED', file=sys.stderr)
        sys.exit(1)
