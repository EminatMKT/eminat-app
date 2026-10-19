#!/usr/bin/env python3
"""Read-only, private ANNIE -> LILLY native Sales row reconciliation.

Checks source and destination identity, ownership, stage, relationship,
membership, payment, and history fields without printing commercial rows.
Run after import while the organization is still pending and staff historical.
"""

import argparse
from collections import Counter
from decimal import Decimal, InvalidOperation
import json
import os
from pathlib import Path
import subprocess
import sys

from sales_migration_common import TABLES, connection_environment, load_bundle


# Only non-PII fields needed to prove canonical relationships and classifications
# cross the migration unchanged. The private source bundle and SQL output remain
# in process memory; mismatch diagnostics contain counts only.
FIELDS = {
    "sales_organizations": ("id", "legacy_annie_id", "code", "status"),
    "sales_members": ("id", "organization_id", "legacy_annie_principal_id",
                      "role", "status", "user_id", "auth_id"),
    "sales_teams": ("id", "organization_id", "legacy_annie_id", "active"),
    "sales_team_members": ("organization_id", "team_id", "member_id"),
    "sales_pipelines": ("id", "organization_id", "legacy_annie_id", "code", "version"),
    "sales_stages": ("id", "organization_id", "legacy_annie_id", "pipeline_id",
                     "code", "position", "probability", "outcome"),
    "sales_leads": ("id", "organization_id", "legacy_annie_id", "owner_member_id",
                    "team_id", "status", "source", "archived"),
    "sales_accounts": ("id", "organization_id", "legacy_annie_id", "owner_member_id",
                       "team_id", "type", "archived"),
    "sales_contacts": ("id", "organization_id", "legacy_annie_id", "owner_member_id",
                       "team_id", "primary_account_id", "archived"),
    "sales_account_contacts": ("organization_id", "account_id", "contact_id",
                               "legacy_annie_id", "role", "is_primary", "active"),
    "sales_opportunities": ("id", "organization_id", "legacy_annie_id", "owner_member_id",
                            "team_id", "account_id", "primary_contact_id", "stage_id",
                            "currency", "amount", "archived"),
    "sales_opportunity_contacts": ("organization_id", "opportunity_id", "contact_id",
                                   "legacy_annie_id", "role"),
    "sales_lead_conversions": ("id", "organization_id", "legacy_annie_id", "lead_id",
                               "contact_id", "account_id", "opportunity_id"),
    "sales_payments": ("id", "organization_id", "legacy_annie_id", "opportunity_id",
                       "owner_member_id", "team_id", "currency", "amount"),
    "sales_memberships": ("id", "organization_id", "legacy_annie_id", "code",
                          "code_number", "plan", "membership_type", "duration",
                          "legacy_plan_label", "legacy_membership_type_label",
                          "legacy_duration_label", "legacy_modality_label", "status",
                          "is_demo", "seller_member_id", "team_id", "primary_contact_id",
                          "opportunity_id", "sales_payment_id", "currency", "amount",
                          "monthly_price_cents", "total_price_cents", "visit_fee_cents",
                          "included_visits"),
    "sales_membership_periods": ("id", "organization_id", "legacy_annie_id",
                                 "membership_id", "plan", "duration",
                                 "legacy_plan_label", "legacy_duration_label",
                                 "legacy_modality_label", "amount_cents"),
    "sales_household_members": ("id", "organization_id", "legacy_annie_id",
                                "membership_id", "contact_id", "relationship",
                                "status", "member_index"),
    "sales_activities": ("id", "organization_id", "legacy_annie_id", "actor_member_id",
                         "assignee_member_id", "lead_id", "contact_id", "account_id",
                         "opportunity_id", "kind", "status", "priority"),
    "sales_meetings": ("id", "organization_id", "legacy_annie_id", "organizer_member_id",
                       "assignee_member_id", "lead_id", "contact_id", "account_id",
                       "opportunity_id", "status", "outcome"),
    "sales_history": ("id", "organization_id", "legacy_annie_id", "actor_member_id",
                      "record_id", "entity_type", "action", "request_id"),
}
NUMERIC = {"version", "position", "probability", "amount", "code_number",
           "monthly_price_cents", "total_price_cents", "visit_fee_cents",
           "included_visits", "amount_cents", "member_index"}


def source_rows(lines: list[str]) -> dict[str, list[dict]]:
    rows = {name: [] for name in TABLES}
    deferred_accounts = {}
    for line in lines:
        entry = json.loads(line)
        if entry["table"] == "__post_contact_primary":
            item = entry["row"]
            if item["contact_id"] in deferred_accounts:
                raise ValueError("SOURCE_CONTACT_LINK_DUPLICATE")
            deferred_accounts[item["contact_id"]] = item["primary_account_id"]
        else:
            rows[entry["table"]].append(entry["row"])
    contacts = {row["id"]: row for row in rows["sales_contacts"]}
    if not deferred_accounts.keys() <= contacts.keys():
        raise ValueError("SOURCE_CONTACT_LINK_MISSING")
    for contact_id, account_id in deferred_accounts.items():
        contacts[contact_id]["primary_account_id"] = account_id
    return rows


def project(table: str, row: dict) -> dict:
    result = {}
    for field in FIELDS[table]:
        value = bool(row.get("archived_at")) if field == "archived" and "archived" not in row \
            else row.get(field)
        if field in NUMERIC and value is not None:
            try:
                value = str(Decimal(str(value)).normalize())
            except InvalidOperation:
                raise ValueError("RECONCILIATION_VALUE_INVALID") from None
        result[field] = value
    return result


def snapshot_sql() -> str:
    queries = []
    for table in TABLES:
        columns = ["archived_at IS NOT NULL AS archived" if field == "archived" else field
                   for field in FIELDS[table]]
        queries.append("'" + table + "', (SELECT coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) "
                       "FROM (SELECT " + ", ".join(columns) + " FROM public." + table + ") r)")
    return "SELECT jsonb_build_object(" + ", ".join(queries) + ")::text;"


def differences(expected: dict[str, list[dict]], actual: dict) -> dict[str, int]:
    mismatch = {}
    for table in TABLES:
        if not isinstance(actual.get(table), list):
            mismatch[table] = len(expected[table]) + 1
            continue
        source = Counter(json.dumps(project(table, row), sort_keys=True, ensure_ascii=True)
                         for row in expected[table])
        target = Counter(json.dumps(project(table, row), sort_keys=True, ensure_ascii=True)
                         for row in actual[table])
        count = sum((source - target).values()) + sum((target - source).values())
        if count:
            mismatch[table] = count
    return mismatch


def main() -> None:
    os.umask(0o077)
    parser = argparse.ArgumentParser(description="Read-only native Sales reconciliation")
    parser.add_argument("bundle", type=Path)
    parser.add_argument("--expected-commit", required=True)
    parser.add_argument("--expected-bundle-sha", required=True)
    parser.add_argument("--expected-manifest-sha", required=True)
    parser.add_argument("--expected-source-release", required=True)
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
    manifest, lines = load_bundle(args.bundle.resolve(), args.expected_bundle_sha,
                                  args.expected_manifest_sha)
    if manifest.get("sourceRelease") != args.expected_source_release:
        raise ValueError("ANNIE_SOURCE_RELEASE_MISMATCH")
    expected = source_rows(lines)
    if not args.execute:
        print(json.dumps({"bundleVerified": True, "rows": sum(map(len, expected.values())),
                          "tables": len(TABLES), "execute": False}))
        return
    env = connection_environment(os.environ.get("LILLY_SALES_PRODUCTION_DB_URL", ""))
    env["PGOPTIONS"] = "-c default_transaction_read_only=on -c statement_timeout=300000"
    result = subprocess.run(["psql", "-X", "-q", "-t", "-A", "-v", "ON_ERROR_STOP=1",
                             "-c", snapshot_sql()], capture_output=True, text=True, env=env,
                            check=False)
    if result.returncode:
        raise ValueError("PRODUCTION_RECONCILIATION_QUERY_FAILED")
    try:
        actual = json.loads(result.stdout.strip())
        mismatch = differences(expected, actual)
    except (TypeError, ValueError, json.JSONDecodeError):
        raise ValueError("PRODUCTION_RECONCILIATION_RESPONSE_INVALID") from None
    if mismatch:
        print(json.dumps({"reconciliation": "FAIL", "mismatchedTables": mismatch}))
        raise ValueError("PRODUCTION_RECONCILIATION_MISMATCH")
    print(json.dumps({"reconciliation": "PASS", "rows": sum(map(len, expected.values())),
                      "tables": len(TABLES), "bundleSha256": manifest["rowsSha256"]}))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError, json.JSONDecodeError) as error:
        code = str(error)
        if code not in {"EXACT_COMMIT_MISMATCH", "WORKTREE_NOT_CLEAN", "PRIVATE_BUNDLE_REQUIRED",
                        "PRIVATE_BUNDLE_PERMISSIONS_INVALID", "MANIFEST_HASH_MISMATCH",
                        "BUNDLE_HASH_MISMATCH", "BUNDLE_COUNTS_MISMATCH", "BUNDLE_ROW_INVALID",
                        "BUNDLE_PDF_INVALID", "BUNDLE_ALREADY_MARKED_LOADED",
                        "ANNIE_SOURCE_RELEASE_MISMATCH", "SOURCE_CONTACT_LINK_MISSING",
                        "SOURCE_CONTACT_LINK_DUPLICATE",
                        "RECONCILIATION_VALUE_INVALID", "PRIVATE_DATABASE_HANDOFF_INVALID",
                        "PRODUCTION_DATABASE_REQUIRED", "PRODUCTION_PROJECT_MISMATCH",
                        "PRODUCTION_RECONCILIATION_QUERY_FAILED",
                        "PRODUCTION_RECONCILIATION_RESPONSE_INVALID",
                        "PRODUCTION_RECONCILIATION_MISMATCH"}:
            code = "PRODUCTION_RECONCILIATION_PRECHECK_FAILED"
        print(code, file=sys.stderr)
        sys.exit(1)
