#!/usr/bin/env python3
"""Guarded exact controlled Seller bootstrap; prints no identity or secrets."""

import argparse
import os
from pathlib import Path
import subprocess
import sys

from sales_migration_common import connection_environment

SCRIPT = Path(__file__).with_name('bootstrap-native-sales-seller.sql')
PREFLIGHT = """
SELECT CASE WHEN count(*)=1 THEN 'PASS' ELSE 'FAIL' END
FROM public.usuarios u
JOIN auth.users a ON a.id=u.auth_id
JOIN public.empresas e ON e.id=u.empresa_id
WHERE u.id='fc17db75-4d79-4130-9267-34187bf03c4a'::uuid
  AND u.auth_id='9d160306-7884-4b1c-9c6c-6402a15b6590'::uuid
  AND lower(u.email)='marketing@eminat.net'
  AND lower(a.email)='marketing@eminat.net'
  AND u.rol='stratix360' AND u.activo=true
  AND e.codigo='STRATIX' AND e.activo=true;
"""
VERIFY = """
SELECT CASE WHEN count(*)=1 THEN 'PASS' ELSE 'FAIL' END
FROM public.sales_members s
JOIN public.sales_organizations o ON o.id=s.organization_id
WHERE s.user_id='fc17db75-4d79-4130-9267-34187bf03c4a'::uuid
  AND s.auth_id='9d160306-7884-4b1c-9c6c-6402a15b6590'::uuid
  AND o.code='stratix' AND o.status='active'
  AND s.role='SELLER' AND s.status='active'
  AND NOT EXISTS (
    SELECT 1 FROM public.sales_members other
    WHERE (other.user_id=s.user_id OR other.auth_id=s.auth_id)
      AND other.organization_id<>s.organization_id AND other.status='active'
  );
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
        raise ValueError('NATIVE_SELLER_SQL_FAILED')
    return result.stdout.strip()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--phase', choices=('check', 'apply', 'verify'), required=True)
    phase = parser.parse_args().phase
    env = connection_environment(os.environ.get('LILLY_SALES_SCHEMA_ADMIN_DB_URL', ''))
    if run(env, sql=PREFLIGHT) != 'PASS':
        raise ValueError('NATIVE_SELLER_IDENTITY_CHANGED')
    if phase == 'apply':
        run(env, file=SCRIPT, read_only=False)
    if phase in ('apply', 'verify') and run(env, sql=VERIFY) != 'PASS':
        raise ValueError('NATIVE_SELLER_BINDING_NOT_VERIFIED')
    print('NATIVE_SELLER_' + phase.upper() + '_PASS')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError):
        print('NATIVE_SELLER_GATE_FAILED', file=sys.stderr)
        sys.exit(1)
