#!/usr/bin/env python3
"""Counts and schema fingerprint only; never reads or emits customer rows."""

import argparse
import json
import os
import subprocess
import sys

from sales_migration_common import connection_environment

SQL = """
SELECT json_build_object(
  'users', (SELECT count(*) FROM public.usuarios),
  'unrelatedSchema', (
    SELECT md5(coalesce(string_agg(
      n.nspname||'.'||c.relname||':'||a.attname||':'||a.atttypid::text||':'||
      a.attnotnull::text, ',' ORDER BY n.nspname,c.relname,a.attnum),''))
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
    WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m')
      AND c.relname NOT LIKE 'sales\\_%' ESCAPE '\\'
  )
)
"""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--verify', help='Previous counts/fingerprint JSON')
    args = parser.parse_args()
    env = connection_environment(os.environ.get('LILLY_SALES_SCHEMA_ADMIN_DB_URL',''))
    env['PGOPTIONS'] = '-c default_transaction_read_only=on -c statement_timeout=30000'
    result = subprocess.run(['psql','-X','-q','-t','-A','-v','ON_ERROR_STOP=1','-c',SQL],
                            env=env,capture_output=True,text=True,check=False)
    if result.returncode:
        raise ValueError('REFERENCE_SNAPSHOT_FAILED')
    actual = json.loads(result.stdout.strip())
    if not isinstance(actual.get('users'), int) or not actual.get('unrelatedSchema'):
        raise ValueError('REFERENCE_SNAPSHOT_INVALID')
    if args.verify:
        if actual != json.loads(args.verify):
            raise ValueError('UNRELATED_SCHEMA_OR_USER_COUNT_CHANGED')
        print('REFERENCE_SCHEMA_UNCHANGED')
    else:
        print(json.dumps(actual,sort_keys=True,separators=(',',':')))


if __name__ == '__main__':
    try:
        main()
    except (ValueError,OSError,TypeError):
        print('REFERENCE_SCHEMA_CHECK_FAILED',file=sys.stderr)
        sys.exit(1)
