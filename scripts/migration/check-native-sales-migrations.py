#!/usr/bin/env python3
"""Fail closed unless the only pending Production migrations are native Sales."""

import argparse
import os
from pathlib import Path
import re
import subprocess
import sys

from sales_migration_common import connection_environment


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--after", action="store_true")
    args = parser.parse_args()
    env = connection_environment(os.environ.get("LILLY_SALES_PRODUCTION_DB_URL", ""))
    env["PGOPTIONS"] = "-c default_transaction_read_only=on -c statement_timeout=30000"
    result = subprocess.run(
        ["psql", "-X", "-q", "-t", "-A", "-v", "ON_ERROR_STOP=1", "-c",
         "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version"],
        capture_output=True, text=True, env=env, check=False,
    )
    if result.returncode:
        raise ValueError("MIGRATION_HISTORY_UNAVAILABLE")
    applied = set(result.stdout.splitlines())
    migrations = {}
    for path in Path("supabase/migrations").glob("*.sql"):
        match = re.fullmatch(r"([0-9]{14})_(.+)\.sql", path.name)
        if match is None or match.group(1) in migrations:
            raise ValueError("LOCAL_MIGRATION_CATALOG_INVALID")
        migrations[match.group(1)] = match.group(2)
    pending = {version: name for version, name in migrations.items() if version not in applied}
    native = {version: name for version, name in migrations.items()
              if name.startswith("native_sales_")}
    if args.after:
        if pending:
            raise ValueError("MIGRATIONS_REMAIN_PENDING")
    elif pending != native or not native or applied & native.keys():
        raise ValueError("UNREVIEWED_PRODUCTION_MIGRATION_SET")
    print("NATIVE_SALES_MIGRATION_SET_PASS")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError):
        print("NATIVE_SALES_MIGRATION_GATE_FAILED", file=sys.stderr)
        sys.exit(1)
