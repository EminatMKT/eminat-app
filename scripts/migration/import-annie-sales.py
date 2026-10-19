#!/usr/bin/env python3
"""Guarded private ANNIE -> empty LILLY native Sales import.

Requires a separately verified fresh Production backup and database handoff.
Reads only an ignored, permission-restricted bundle; never prints rows or secrets.
All inserts and reconciliation checks run in one transaction. It does not
activate the Sales organization or any imported historical staff login.
"""

import argparse
import csv
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from urllib.parse import urlparse, unquote


TABLES = [
    "sales_organizations", "sales_members", "sales_teams", "sales_team_members",
    "sales_pipelines", "sales_stages", "sales_leads", "sales_accounts",
    "sales_contacts", "sales_account_contacts", "sales_opportunities",
    "sales_opportunity_contacts", "sales_lead_conversions", "sales_payments",
    "sales_memberships", "sales_membership_periods", "sales_household_members",
    "sales_activities", "sales_meetings", "sales_history",
]
PROJECT_REF = "ruedelunbtaomhrzgelc"


def load_bundle(directory: Path, expected_hash: str) -> tuple[dict, list[str]]:
    if ".local" not in directory.parts or not directory.is_dir():
        raise ValueError("PRIVATE_BUNDLE_REQUIRED")
    if directory.stat().st_mode & 0o077:
        raise ValueError("PRIVATE_BUNDLE_PERMISSIONS_INVALID")
    manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
    content = (directory / "rows.ndjson").read_bytes()
    actual_hash = hashlib.sha256(content).hexdigest()
    if actual_hash != expected_hash or actual_hash != manifest.get("rowsSha256"):
        raise ValueError("BUNDLE_HASH_MISMATCH")
    if manifest.get("productionLoaded") is not False:
        raise ValueError("BUNDLE_ALREADY_MARKED_LOADED")
    counts = {table: 0 for table in TABLES + ["__post_contact_primary"]}
    lines = content.decode("utf-8").splitlines()
    for line in lines:
        row = json.loads(line)
        if row.get("table") not in counts or not isinstance(row.get("row"), dict):
            raise ValueError("BUNDLE_ROW_INVALID")
        counts[row["table"]] += 1
    if counts != manifest.get("destinationCounts"):
        raise ValueError("BUNDLE_COUNTS_MISMATCH")
    return manifest, lines


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


def connection_environment(url: str) -> dict[str, str]:
    parsed = urlparse(url)
    if parsed.scheme not in {"postgres", "postgresql"} or not parsed.hostname or not parsed.username:
        raise ValueError("PRIVATE_DATABASE_HANDOFF_INVALID")
    if parsed.hostname in {"localhost", "127.0.0.1", "::1"}:
        raise ValueError("PRODUCTION_DATABASE_REQUIRED")
    if PROJECT_REF not in parsed.hostname and PROJECT_REF not in unquote(parsed.username):
        raise ValueError("PRODUCTION_PROJECT_MISMATCH")
    env = os.environ.copy()
    env.update({"PGHOST": parsed.hostname, "PGPORT": str(parsed.port or 5432),
                "PGUSER": unquote(parsed.username), "PGPASSWORD": unquote(parsed.password or ""),
                "PGDATABASE": unquote(parsed.path.lstrip("/") or "postgres"),
                "PGSSLMODE": "verify-full", "PGSSLROOTCERT": "system",
                "PGCONNECT_TIMEOUT": "10"})
    if not env["PGPASSWORD"]:
        raise ValueError("PRIVATE_DATABASE_HANDOFF_INVALID")
    return env


def main() -> None:
    os.umask(0o077)
    parser = argparse.ArgumentParser(description="Guarded native Sales import")
    parser.add_argument("bundle", type=Path)
    parser.add_argument("--expected-commit", required=True)
    parser.add_argument("--expected-bundle-sha", required=True)
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
    manifest, lines = load_bundle(directory, args.expected_bundle_sha)
    if not args.execute:
        print(json.dumps({"bundleVerified": True, "rows": len(lines),
                          "destinationTables": len(TABLES), "execute": False}))
        return
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
                        "PRIVATE_BUNDLE_PATH_INVALID", "PRIVATE_DATABASE_HANDOFF_INVALID",
                        "PRODUCTION_DATABASE_REQUIRED", "PRODUCTION_PROJECT_MISMATCH",
                        "EXACT_COMMIT_MISMATCH",
                        "WORKTREE_NOT_CLEAN",
                        "PRODUCTION_IMPORT_FAILED_CHECK_TRANSACTION_STATE_PRIVATELY"}:
            code = "PRODUCTION_IMPORT_PRECHECK_FAILED"
        print(code, file=sys.stderr)
        sys.exit(1)
