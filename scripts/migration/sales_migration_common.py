"""Private ANNIE to LILLY Sales bundle and database connection gates."""

import hashlib
import json
import os
from pathlib import Path
from urllib.parse import unquote, urlparse


TABLES = [
    "sales_organizations", "sales_members", "sales_teams", "sales_team_members",
    "sales_pipelines", "sales_stages", "sales_leads", "sales_accounts",
    "sales_contacts", "sales_account_contacts", "sales_opportunities",
    "sales_opportunity_contacts", "sales_lead_conversions", "sales_payments",
    "sales_memberships", "sales_membership_periods", "sales_household_members",
    "sales_activities", "sales_meetings", "sales_history",
]
PROJECT_REF = "ruedelunbtaomhrzgelc"


def load_bundle(directory: Path, expected_hash: str,
                expected_manifest_hash: str) -> tuple[dict, list[str]]:
    if ".local" not in directory.parts or not directory.is_dir():
        raise ValueError("PRIVATE_BUNDLE_REQUIRED")
    if directory.stat().st_mode & 0o077:
        raise ValueError("PRIVATE_BUNDLE_PERMISSIONS_INVALID")
    manifest_bytes = (directory / "manifest.json").read_bytes()
    if hashlib.sha256(manifest_bytes).hexdigest() != expected_manifest_hash:
        raise ValueError("MANIFEST_HASH_MISMATCH")
    manifest = json.loads(manifest_bytes)
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
    for artifact in manifest.get("pdfArtifacts", []):
        if not isinstance(artifact, dict) or not isinstance(artifact.get("filename"), str):
            raise ValueError("BUNDLE_PDF_INVALID")
        name = artifact["filename"]
        if Path(name).name != name:
            raise ValueError("BUNDLE_PDF_INVALID")
        artifact_path = directory / "pdfs" / name
        if artifact_path.is_symlink() or not artifact_path.is_file():
            raise ValueError("BUNDLE_PDF_INVALID")
        content = artifact_path.read_bytes()
        if len(content) != artifact.get("bytes") or \
                hashlib.sha256(content).hexdigest() != artifact.get("sha256"):
            raise ValueError("BUNDLE_PDF_INVALID")
    return manifest, lines


def connection_environment(url: str) -> dict[str, str]:
    parsed = urlparse(url)
    if parsed.scheme not in {"postgres", "postgresql"} or not parsed.hostname or not parsed.username:
        raise ValueError("PRIVATE_DATABASE_HANDOFF_INVALID")
    if parsed.hostname in {"localhost", "127.0.0.1", "::1"}:
        raise ValueError("PRODUCTION_DATABASE_REQUIRED")
    username = unquote(parsed.username)
    direct = parsed.hostname == f"db.{PROJECT_REF}.supabase.co" and username == "postgres"
    session_pooler = parsed.hostname.endswith(".pooler.supabase.com") and \
        username == f"postgres.{PROJECT_REF}"
    if not (direct or session_pooler) or (parsed.port or 5432) != 5432:
        raise ValueError("PRODUCTION_PROJECT_MISMATCH")
    env = {key: value for key, value in os.environ.items() if not key.startswith("PG")}
    env.update({"PGHOST": parsed.hostname, "PGPORT": str(parsed.port or 5432),
                "PGUSER": username, "PGPASSWORD": unquote(parsed.password or ""),
                "PGDATABASE": unquote(parsed.path.lstrip("/") or "postgres"),
                "PGSSLMODE": "verify-full", "PGSSLROOTCERT": "system",
                "PGCONNECT_TIMEOUT": "10"})
    if not env["PGPASSWORD"]:
        raise ValueError("PRIVATE_DATABASE_HANDOFF_INVALID")
    return env
