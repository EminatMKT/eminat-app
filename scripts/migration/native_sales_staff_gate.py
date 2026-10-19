#!/usr/bin/env python3
"""Guarded one-person Native Sales bootstrap; prints no identity or secret values."""

import argparse
import os
from pathlib import Path
import subprocess
import sys

from sales_migration_common import connection_environment

SCRIPT = Path(__file__).with_name('bootstrap-native-sales-seller.sql')

PREFLIGHT = """
SELECT CASE WHEN count(*)=1 THEN 'PASS' ELSE 'FAIL' END
FROM public.annie_sales_user_mappings m
JOIN public.annie_sales_tenant_mappings t
  ON t.empresa_codigo=m.empresa_codigo
 AND t.annie_organization_id=m.annie_organization_id
JOIN public.usuarios u ON u.id=m.lilly_usuario_id
  AND u.auth_id=m.supabase_auth_id AND u.activo=true
JOIN auth.users a ON a.id=m.supabase_auth_id
JOIN public.usuario_empresas_acceso x ON x.usuario_id=u.id
  AND x.empresa_codigo=m.empresa_codigo
JOIN public.empresas e ON e.codigo=m.empresa_codigo AND e.activo=true
WHERE m.status='active' AND t.status='active'
  AND lower(u.email)='marketing@eminat.net'
  AND lower(a.email)='marketing@eminat.net';
"""
VERIFY = """
SELECT CASE WHEN count(*)=1 THEN 'PASS' ELSE 'FAIL' END
FROM public.sales_members s
JOIN public.sales_organizations o ON o.id=s.organization_id
JOIN public.usuarios u ON u.id=s.user_id AND u.auth_id=s.auth_id AND u.activo=true
JOIN auth.users a ON a.id=s.auth_id
WHERE lower(u.email)='marketing@eminat.net'
  AND lower(a.email)='marketing@eminat.net'
  AND s.role='SELLER' AND s.status='active' AND o.status='active';
"""


def run(env: dict[str, str], *, sql: str | None = None, file: Path | None = None,
        read_only: bool = True) -> str:
    args = ['psql', '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1']
    if file:
        args += ['--single-transaction', '-f', str(file)]
    else:
        args += ['-c', sql or '']
    pg_env = dict(env)
    pg_env['PGOPTIONS'] = '-c statement_timeout=30000' + \
        (' -c default_transaction_read_only=on' if read_only else '')
    result = subprocess.run(args, env=pg_env, capture_output=True, text=True, check=False)
    if result.returncode:
        raise ValueError('NATIVE_STAFF_SQL_FAILED')
    return result.stdout.strip()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--phase', choices=('check', 'apply', 'verify'), required=True)
    phase = parser.parse_args().phase
    env = connection_environment(os.environ.get('LILLY_SALES_SCHEMA_ADMIN_DB_URL', ''))
    if run(env, sql=PREFLIGHT) != 'PASS':
        raise ValueError('NATIVE_SELLER_MAPPING_NOT_APPROVED')
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
