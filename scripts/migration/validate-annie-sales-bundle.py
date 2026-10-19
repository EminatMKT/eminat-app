#!/usr/bin/env python3
"""Verify a private ANNIE transfer bundle and emit a rollback-only SQL dry run.

The SQL never commits. Run it only against a disposable local database with
the reviewed native Sales migrations applied. It never contains source rows;
the separate CSV is private and must never enter Git or logs.
"""

import csv
import hashlib
import json
import os
from pathlib import Path
import sys


ORDER = [
    "sales_organizations", "sales_members", "sales_teams", "sales_team_members",
    "sales_pipelines", "sales_stages", "sales_leads", "sales_accounts",
    "sales_contacts", "sales_account_contacts", "sales_opportunities",
    "sales_opportunity_contacts", "sales_lead_conversions", "sales_payments",
    "sales_memberships", "sales_membership_periods", "sales_household_members",
    "sales_activities", "sales_meetings", "sales_history",
]


def main():
    os.umask(0o077)
    if len(sys.argv) != 2:
        raise ValueError("usage: validate-annie-sales-bundle.py PRIVATE_BUNDLE_DIRECTORY")
    directory = Path(sys.argv[1]).resolve()
    if ".local" not in directory.parts or not directory.is_dir():
        raise ValueError("bundle must be in a private .local directory")
    manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
    lines = (directory / "rows.ndjson").read_bytes()
    if hashlib.sha256(lines).hexdigest() != manifest["rowsSha256"]:
        raise ValueError("bundle checksum mismatch")
    rows = [json.loads(line) for line in lines.splitlines()]
    counts = {table: 0 for table in ORDER + ["__post_contact_primary"]}
    for item in rows:
        if item.get("table") not in counts or not isinstance(item.get("row"), dict):
            raise ValueError("unexpected transfer row")
        counts[item["table"]] += 1
    if counts != manifest["destinationCounts"] or manifest.get("productionLoaded") is not False:
        raise ValueError("transfer manifest mismatch")
    for artifact in manifest["pdfArtifacts"]:
        path = directory / "pdfs" / artifact["filename"]
        content = path.read_bytes()
        if len(content) != artifact["bytes"] or hashlib.sha256(content).hexdigest() != artifact["sha256"]:
            raise ValueError("PDF checksum mismatch")
    csv_path = directory / "rows.csv"
    with csv_path.open("w", encoding="utf-8", newline="") as stream:
        os.chmod(csv_path, 0o600)
        writer = csv.writer(stream)
        for line in lines.splitlines():
            writer.writerow([line.decode("utf-8")])
    quoted_path = str(csv_path).replace("'", "''")
    ordered_tables = ",".join("'" + table + "'" for table in ORDER)
    sql = r"""\set ON_ERROR_STOP on
BEGIN;
SET LOCAL request.jwt.claim.role='service_role';
-- These DDL statements simulate branch-only additive schema changes on the
-- disposable baseline. They must not be run against Production.
ALTER TABLE public.sales_members ALTER COLUMN user_id DROP NOT NULL, ALTER COLUMN auth_id DROP NOT NULL;
ALTER TABLE public.sales_members ADD COLUMN display_name text CHECK (display_name IS NULL OR length(btrim(display_name)) BETWEEN 1 AND 160);
ALTER TABLE public.sales_members DROP CONSTRAINT sales_members_status_check;
ALTER TABLE public.sales_members ADD CONSTRAINT sales_members_status_check CHECK (status IN ('pending','active','revoked','historical'));
ALTER TABLE public.sales_members ADD CONSTRAINT sales_members_historical_check CHECK ((status='historical' AND user_id IS NULL AND auth_id IS NULL AND legacy_annie_principal_id IS NOT NULL) OR (status<>'historical' AND user_id IS NOT NULL AND auth_id IS NOT NULL));
ALTER TABLE public.sales_activities DROP CONSTRAINT sales_activities_check;
ALTER TABLE public.sales_activities ADD CONSTRAINT sales_activities_check CHECK (num_nonnulls(lead_id,contact_id,account_id,opportunity_id)>=1 OR kind='TASK');
ALTER TABLE public.sales_meetings DROP CONSTRAINT sales_meetings_status_check;
ALTER TABLE public.sales_meetings ADD CONSTRAINT sales_meetings_status_check CHECK (status IN ('SCHEDULED','COMPLETED','CANCELLED','NO_SHOW'));
CREATE TEMP TABLE annie_import_raw(raw text);
\copy annie_import_raw(raw) FROM '__CSV_PATH__' WITH (FORMAT csv)
CREATE TEMP TABLE annie_import_rows AS SELECT raw::jsonb->>'table' AS table_name,raw::jsonb->'row' AS item FROM annie_import_raw;
DO $$
DECLARE v_table text; v_item jsonb; v_cols text; v_bad text; v_expected int; v_actual int;
BEGIN
 FOR v_table IN SELECT unnest(ARRAY[__ORDER__]) LOOP
  FOR v_item IN SELECT item FROM annie_import_rows WHERE table_name=v_table LOOP
   SELECT key INTO v_bad FROM jsonb_object_keys(v_item) AS key
     WHERE NOT EXISTS (SELECT 1 FROM pg_attribute
       WHERE attrelid=format('public.%I',v_table)::regclass
         AND attname=key AND attnum>0 AND NOT attisdropped) LIMIT 1;
   IF v_bad IS NOT NULL THEN RAISE EXCEPTION 'unknown destination column %.%',v_table,v_bad; END IF;
   SELECT string_agg(format('%I',key),',') INTO v_cols FROM jsonb_object_keys(v_item) AS key;
   EXECUTE format('INSERT INTO public.%I (%s) SELECT %s FROM jsonb_populate_record(NULL::public.%I,$1) AS r',v_table,v_cols,v_cols,v_table) USING v_item;
  END LOOP;
  SELECT count(*) INTO v_expected FROM annie_import_rows WHERE table_name=v_table;
  EXECUTE format('SELECT count(*) FROM public.%I',v_table) INTO v_actual;
  IF v_actual<>v_expected THEN RAISE EXCEPTION 'count mismatch %',v_table; END IF;
 END LOOP;
 FOR v_item IN SELECT item FROM annie_import_rows WHERE table_name='__post_contact_primary' LOOP
  UPDATE public.sales_contacts SET primary_account_id=(v_item->>'primary_account_id')::uuid
    WHERE id=(v_item->>'contact_id')::uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'missing contact primary account'; END IF;
 END LOOP;
 IF (SELECT count(*) FROM annie_import_rows) <> __ROW_COUNT__ THEN
   RAISE EXCEPTION 'unexpected source row count'; END IF;
END $$;
ROLLBACK;
"""
    sql = sql.replace("__CSV_PATH__", quoted_path).replace("__ORDER__", ordered_tables)
    sql = sql.replace("__ROW_COUNT__", str(len(rows)))
    sql_path = directory / "local-dry-run.sql"
    sql_path.write_text(sql, encoding="utf-8")
    os.chmod(sql_path, 0o600)
    print(json.dumps({"bundleVerified": True, "rows": len(rows),
                      "pdfs": len(manifest["pdfArtifacts"]), "dryRunReady": True}))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, KeyError, json.JSONDecodeError):
        print("ANNIE_TRANSFER_BUNDLE_INVALID", file=sys.stderr)
        sys.exit(1)
