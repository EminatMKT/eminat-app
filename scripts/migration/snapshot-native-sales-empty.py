#!/usr/bin/env python3
"""Read-only pre-import snapshot: reject nonempty native Sales destination tables."""

import argparse
import json
import os
import subprocess
import sys

from sales_migration_common import TABLES, connection_environment


def query(sql, env):
    result = subprocess.run(
        ["psql", "-X", "-q", "-t", "-A", "-v", "ON_ERROR_STOP=1", "-c", sql],
        capture_output=True, text=True, env=env, check=False,
    )
    if result.returncode:
        raise ValueError("NATIVE_SALES_SNAPSHOT_QUERY_FAILED")
    return result.stdout.strip()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--allow-absent", action="store_true")
    parser.add_argument("--phase", choices=("schema", "data"), default="data")
    args = parser.parse_args()
    secret = ("LILLY_SALES_SCHEMA_ADMIN_DB_URL" if args.phase == "schema"
              else "LILLY_SALES_PRODUCTION_DB_URL")
    env = connection_environment(os.environ.get(secret, ""))
    env["PGOPTIONS"] = "-c default_transaction_read_only=on -c statement_timeout=30000"
    names = ",".join(f"to_regclass('public.{table}') IS NOT NULL" for table in TABLES)
    present = query(f"SELECT json_build_array({names})", env)
    try:
        exists = json.loads(present)
    except (TypeError, ValueError):
        raise ValueError("NATIVE_SALES_SNAPSHOT_INVALID") from None
    if not isinstance(exists, list) or len(exists) != len(TABLES) or \
            not all(isinstance(value, bool) for value in exists):
        raise ValueError("NATIVE_SALES_SNAPSHOT_INVALID")
    if not any(exists) and args.allow_absent:
        print(json.dumps({"existingTables": 0, "existingRows": 0}))
        return
    if not all(exists):
        raise ValueError("NATIVE_SALES_SCHEMA_INCOMPLETE")
    counts = query("SELECT json_build_array(" + ",".join(
        f"(SELECT count(*) FROM public.{table})" for table in TABLES) + ")", env)
    try:
        values = json.loads(counts)
    except (TypeError, ValueError):
        raise ValueError("NATIVE_SALES_SNAPSHOT_INVALID") from None
    if not isinstance(values, list) or len(values) != len(TABLES) or \
            not all(type(value) is int and value == 0 for value in values):
        raise ValueError("NATIVE_SALES_DESTINATION_NOT_EMPTY")
    print(json.dumps({"existingTables": len(TABLES), "existingRows": 0}))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError):
        print("NATIVE_SALES_SNAPSHOT_FAILED", file=sys.stderr)
        sys.exit(1)
