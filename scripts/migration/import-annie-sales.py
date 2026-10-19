#!/usr/bin/env python3
"""Guarded private ANNIE -> empty LILLY native Sales import.

Requires a separately verified fresh Production backup and database handoff.
Reads only an ignored, permission-restricted bundle; never prints rows or secrets.
All inserts and reconciliation checks run in one transaction. It does not
activate the Sales organization or any imported historical staff login.
"""

import argparse
import csv
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import subprocess
import sys
from sales_migration_common import TABLES, connection_environment, load_bundle


def private_csv(directory: Path, lines: list[str]) -> Path:
    path = directory / "rows.csv"
    with path.open("w", encoding="utf-8", newline="") as stream:
        os.chmod(path, 0o600)
        writer = csv.writer(stream)
        writer.writerows([[line] for line in lines])
    return path


def sql(csv_path: Path, total: int) -> str:
    # psql backslash commands have their own quoting rules; reject unusual paths.
    location = str(csv_path)
    if any(char in location for char in "'\n\r\\"):
        raise ValueError("PRIVATE_BUNDLE_PATH_INVALID")
    names = ",".join("'" + name + "'" for name in TABLES)
    return r"""\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='5min';
SET LOCAL request.jwt.claim.role='service_role';
DO $$ DECLARE v_table text; v_count bigint; BEGIN
  FOR v_table IN SELECT unnest(ARRAY[__TABLES__]) LOOP
    IF to_regclass(format('public.%I',v_table)) IS NULL THEN
      RAISE EXCEPTION 'NATIVE_SALES_SCHEMA_MISSING'; END IF;
    EXECUTE format('SELECT count(*) FROM public.%I',v_table) INTO v_count;
    IF v_count<>0 THEN RAISE EXCEPTION 'NATIVE_SALES_DESTINATION_NOT_EMPTY'; END IF;
  END LOOP;
END $$;
CREATE TEMP TABLE annie_import_raw(raw text);
\copy annie_import_raw(raw) FROM '__CSV__' WITH (FORMAT csv)
CREATE TEMP TABLE annie_import_rows AS SELECT raw::jsonb->>'table' AS table_name,
  raw::jsonb->'row' AS item FROM annie_import_raw;
DO $$
DECLARE v_table text; v_item jsonb; v_cols text; v_bad text;
DECLARE v_expected bigint; v_actual bigint;
BEGIN
 FOR v_table IN SELECT unnest(ARRAY[__TABLES__]) LOOP
  FOR v_item IN SELECT item FROM annie_import_rows WHERE table_name=v_table LOOP
   SELECT key INTO v_bad FROM jsonb_object_keys(v_item) AS key
     WHERE NOT EXISTS (SELECT 1 FROM pg_attribute
       WHERE attrelid=format('public.%I',v_table)::regclass
         AND attname=key AND attnum>0 AND NOT attisdropped) LIMIT 1;
   IF v_bad IS NOT NULL THEN RAISE EXCEPTION 'NATIVE_SALES_IMPORT_COLUMN_INVALID'; END IF;
   SELECT string_agg(format('%I',key),',') INTO v_cols FROM jsonb_object_keys(v_item) AS key;
   EXECUTE format('INSERT INTO public.%I (%s) SELECT %s FROM jsonb_populate_record(NULL::public.%I,$1) AS r',
     v_table,v_cols,v_cols,v_table) USING v_item;
  END LOOP;
  SELECT count(*) INTO v_expected FROM annie_import_rows WHERE table_name=v_table;
  EXECUTE format('SELECT count(*) FROM public.%I',v_table) INTO v_actual;
  IF v_actual<>v_expected THEN RAISE EXCEPTION 'NATIVE_SALES_IMPORT_COUNT_MISMATCH'; END IF;
 END LOOP;
 FOR v_item IN SELECT item FROM annie_import_rows WHERE table_name='__post_contact_primary' LOOP
  UPDATE public.sales_contacts SET primary_account_id=(v_item->>'primary_account_id')::uuid
    WHERE id=(v_item->>'contact_id')::uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'NATIVE_SALES_CONTACT_LINK_MISSING'; END IF;
 END LOOP;
 IF (SELECT count(*) FROM annie_import_rows)<>__TOTAL__ THEN
   RAISE EXCEPTION 'NATIVE_SALES_IMPORT_TOTAL_MISMATCH'; END IF;
 IF EXISTS (SELECT 1 FROM public.sales_organizations WHERE status<>'pending') OR
    EXISTS (SELECT 1 FROM public.sales_members WHERE status<>'historical') THEN
   RAISE EXCEPTION 'NATIVE_SALES_IMPORT_ACCESS_NOT_DISABLED'; END IF;
END $$;
COMMIT;
""".replace("__TABLES__", names).replace("__CSV__", location).replace("__TOTAL__", str(total))


def main() -> None:
    os.umask(0o077)
    parser = argparse.ArgumentParser(description="Guarded native Sales import")
    parser.add_argument("bundle", type=Path)
    parser.add_argument("--expected-commit", required=True)
    parser.add_argument("--expected-bundle-sha", required=True)
    parser.add_argument("--expected-manifest-sha", required=True)
    parser.add_argument("--expected-source-release")
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    current = subprocess.run(["git", "rev-parse", "HEAD"], check=True,
                             capture_output=True, text=True).stdout.strip()
    if current != args.expected_commit:
        raise ValueError("EXACT_COMMIT_MISMATCH")
    status = subprocess.run(["git", "status", "--porcelain"], check=True,
                            capture_output=True, text=True).stdout.strip()
    if status:
        raise ValueError("WORKTREE_NOT_CLEAN")
    directory = args.bundle.resolve()
    manifest, lines = load_bundle(directory, args.expected_bundle_sha,
                                  args.expected_manifest_sha)
    if not args.execute:
        print(json.dumps({"bundleVerified": True, "rows": len(lines),
                          "destinationTables": len(TABLES), "execute": False}))
        return
    if not args.expected_source_release or manifest.get("sourceRelease") != args.expected_source_release:
        raise ValueError("ANNIE_SOURCE_RELEASE_MISMATCH")
    try:
        snapshot_at = datetime.fromisoformat(manifest["sourceSnapshotAt"])
    except (KeyError, TypeError, ValueError):
        raise ValueError("SOURCE_SNAPSHOT_INVALID") from None
    if snapshot_at.tzinfo is None or not (
        timedelta(0) <= datetime.now(timezone.utc) - snapshot_at <= timedelta(hours=4)
    ):
        raise ValueError("FRESH_SOURCE_EXPORT_REQUIRED")
    connection = os.environ.get("LILLY_SALES_PRODUCTION_DB_URL", "")
    env = connection_environment(connection)
    csv_path = private_csv(directory, lines)
    try:
        result = subprocess.run(["psql", "-X", "-q", "-v", "ON_ERROR_STOP=1"],
                                input=sql(csv_path, len(lines)), text=True,
                                capture_output=True, env=env, check=False)
    finally:
        csv_path.unlink(missing_ok=True)
    if result.returncode:
        # psql errors can contain patient/commercial values; never print stderr.
        raise ValueError("PRODUCTION_IMPORT_FAILED_CHECK_TRANSACTION_STATE_PRIVATELY")
    print(json.dumps({"importCommitted": True, "rows": len(lines),
                      "bundleSha256": manifest["rowsSha256"]}))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError, json.JSONDecodeError) as error:
        code = str(error)
        if code not in {"PRIVATE_BUNDLE_REQUIRED", "PRIVATE_BUNDLE_PERMISSIONS_INVALID",
                        "BUNDLE_HASH_MISMATCH", "BUNDLE_ALREADY_MARKED_LOADED",
                        "BUNDLE_ROW_INVALID", "BUNDLE_COUNTS_MISMATCH",
                        "MANIFEST_HASH_MISMATCH",
                        "BUNDLE_PDF_INVALID",
                        "PRIVATE_BUNDLE_PATH_INVALID", "PRIVATE_DATABASE_HANDOFF_INVALID",
                        "PRODUCTION_DATABASE_REQUIRED", "PRODUCTION_PROJECT_MISMATCH",
                        "EXACT_COMMIT_MISMATCH",
                        "WORKTREE_NOT_CLEAN",
                        "SOURCE_SNAPSHOT_INVALID", "FRESH_SOURCE_EXPORT_REQUIRED",
                        "ANNIE_SOURCE_RELEASE_MISMATCH",
                        "PRODUCTION_IMPORT_FAILED_CHECK_TRANSACTION_STATE_PRIVATELY"}:
            code = "PRODUCTION_IMPORT_PRECHECK_FAILED"
        print(code, file=sys.stderr)
        sys.exit(1)
