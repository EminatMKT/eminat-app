#!/usr/bin/env python3
"""Verify a private ANNIE PDF bundle, then optionally archive it in LILLY Storage.

Default is offline validation. Live upload requires an exact bundle hash and a
private service-role environment; no PDF bytes, credentials, or IDs are logged.
"""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import sys
from urllib import error, parse, request


BUCKET = "sales-membership-archive"
UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", re.I)


def fail(code):
    raise ValueError(code)


def call(url, key, method="GET", body=None, extra=None):
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    headers.update(extra or {})
    req = request.Request(url, data=body, headers=headers, method=method)
    try:
        with request.urlopen(req, timeout=20) as response:
            return response.status, response.read()
    except error.HTTPError as cause:
        return cause.code, b""
    except (error.URLError, TimeoutError):
        fail("ARCHIVE_TRANSPORT_UNAVAILABLE")


def checked_artifacts(directory, manifest):
    if ".local" not in directory.parts or not directory.is_dir():
        fail("ARCHIVE_PRIVATE_DIRECTORY_REQUIRED")
    rows = (directory / "rows.ndjson").read_bytes()
    if hashlib.sha256(rows).hexdigest() != manifest.get("rowsSha256"):
        fail("ARCHIVE_BUNDLE_HASH_INVALID")
    organizations = set()
    memberships = set()
    for line in rows.splitlines():
        item = json.loads(line)
        row = item.get("row")
        if item.get("table") == "sales_organizations":
            organizations.add(row.get("id"))
        if item.get("table") == "sales_memberships":
            memberships.add((row.get("organization_id"), row.get("id")))
    if len(organizations) != 1 or not all(UUID.fullmatch(value or "") for value in organizations):
        fail("ARCHIVE_ORGANIZATION_INVALID")
    organization = next(iter(organizations))
    artifacts = []
    seen = set()
    for item in manifest.get("pdfArtifacts", []):
        membership = item.get("membershipId")
        kind = item.get("kind")
        if not isinstance(membership, str) or not UUID.fullmatch(membership) or kind not in ("membership", "agreement"):
            fail("ARCHIVE_ARTIFACT_INVALID")
        if item.get("filename") != f"{membership}-{kind}.pdf" or (membership, kind) in seen:
            fail("ARCHIVE_ARTIFACT_INVALID")
        seen.add((membership, kind))
        if (organization, membership) not in memberships:
            fail("ARCHIVE_MEMBERSHIP_MISSING")
        blob = (directory / "pdfs" / item["filename"]).read_bytes()
        digest = hashlib.sha256(blob).hexdigest()
        if not blob.startswith(b"%PDF-") or not 0 < len(blob) <= 10485760 or \
                len(blob) != item.get("bytes") or digest != item.get("sha256"):
            fail("ARCHIVE_PDF_HASH_INVALID")
        artifacts.append((membership, kind, blob, digest))
    return organization, artifacts


def migration_object_key(rows_sha, organization, membership, kind):
    if not re.fullmatch(r"[0-9a-f]{64}", rows_sha):
        fail("ARCHIVE_BUNDLE_HASH_INVALID")
    return f"native-sales/{rows_sha}/{organization}/{membership}/{kind}.pdf"


def cleanup_created(base, key, created):
    """Only remove objects and metadata created by this invocation."""
    for meta_url, object_url in reversed(created):
        if meta_url:
            status, _ = call(meta_url, key, "DELETE")
            if status not in (200, 204, 404):
                fail("ARCHIVE_CLEANUP_FAILED")
        status, _ = call(object_url, key, "DELETE")
        if status not in (200, 204, 404):
            fail("ARCHIVE_CLEANUP_FAILED")


def storage_rehearsal(base, key, rows_sha):
    """Exercise private object create/read/delete with synthetic bytes only."""
    object_key = f"native-sales-rehearsal/{rows_sha}/{secrets.token_hex(8)}.txt"
    url = f"{base}/storage/v1/object/{BUCKET}/{parse.quote(object_key, safe='/')}"
    status, _ = call(url, key, "POST", b"synthetic-storage-probe", {"Content-Type": "text/plain", "x-upsert": "false"})
    if status not in (200, 201):
        fail("ARCHIVE_REHEARSAL_UPLOAD_FAILED")
    try:
        status, body = call(url, key)
        if status != 200 or body != b"synthetic-storage-probe":
            fail("ARCHIVE_REHEARSAL_READ_FAILED")
    finally:
        status, _ = call(url, key, "DELETE")
        if status not in (200, 204):
            fail("ARCHIVE_REHEARSAL_CLEANUP_FAILED")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("private_bundle", type=Path)
    parser.add_argument("--commit", action="store_true")
    parser.add_argument("--rehearse-storage", action="store_true")
    parser.add_argument("--expected-rows-sha256")
    args = parser.parse_args()
    directory = args.private_bundle.resolve()
    manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
    organization, artifacts = checked_artifacts(directory, manifest)
    if args.commit and args.rehearse_storage:
        fail("ARCHIVE_MODE_INVALID")
    if not args.commit and not args.rehearse_storage:
        print(json.dumps({"archiveBundleVerified": True, "pdfs": len(artifacts), "uploaded": False}))
        return
    if args.expected_rows_sha256 != manifest["rowsSha256"] or \
            (args.commit and os.getenv("LILLY_ARCHIVE_UPLOAD_APPROVED") != "true"):
        fail("ARCHIVE_RELEASE_GATE_CLOSED")
    base = os.getenv("LILLY_SUPABASE_URL", "").rstrip("/")
    key = os.getenv("LILLY_SUPABASE_SERVICE_ROLE_KEY", "")
    if not base.startswith("https://") or not key:
        fail("ARCHIVE_PRIVATE_CONNECTION_REQUIRED")
    if args.rehearse_storage:
        storage_rehearsal(base, key, manifest["rowsSha256"])
        print(json.dumps({"storageRehearsal": True, "cleanup": True}))
        return
    uploaded = 0
    created = []
    try:
        for membership, kind, blob, digest in artifacts:
            rest = f"{base}/rest/v1/sales_memberships?organization_id=eq.{organization}&id=eq.{membership}&select=id"
            status, content = call(rest, key)
            if status != 200 or len(json.loads(content)) != 1:
                fail("ARCHIVE_DESTINATION_MEMBERSHIP_MISSING")
            object_key = migration_object_key(manifest["rowsSha256"], organization, membership, kind)
            path = f"{base}/storage/v1/object/{BUCKET}/{parse.quote(object_key, safe='/')}"
            upload_status, _ = call(path, key, "POST", blob, {"Content-Type": "application/pdf", "x-upsert": "false"})
            if upload_status not in (200, 201, 409):
                fail("ARCHIVE_UPLOAD_FAILED")
            if upload_status != 409:
                created.append((None, path))
            status, stored = call(path, key)
            if status != 200 or hashlib.sha256(stored).hexdigest() != digest:
                fail("ARCHIVE_STORED_HASH_INVALID")
            meta_url = (f"{base}/rest/v1/sales_membership_archive_documents?organization_id=eq.{organization}"
                        f"&membership_id=eq.{membership}&kind=eq.{kind}&select=object_key,sha256,byte_count")
            status, content = call(meta_url, key)
            if status != 200:
                fail("ARCHIVE_METADATA_UNAVAILABLE")
            existing = json.loads(content)
            expected = {"object_key": object_key, "sha256": digest, "byte_count": len(blob)}
            if existing:
                if len(existing) != 1 or existing[0] != expected:
                    fail("ARCHIVE_METADATA_CONFLICT")
            else:
                if upload_status == 409:
                    fail("ARCHIVE_PREEXISTING_OBJECT_WITHOUT_METADATA")
                payload = json.dumps({"organization_id": organization, "membership_id": membership,
                                      "kind": kind, **expected}).encode()
                status, _ = call(f"{base}/rest/v1/sales_membership_archive_documents", key,
                                 "POST", payload, {"Content-Type": "application/json", "Prefer": "return=minimal"})
                if status not in (200, 201, 204):
                    fail("ARCHIVE_METADATA_WRITE_FAILED")
                created[-1] = (meta_url.replace("&select=object_key,sha256,byte_count", ""), path)
            uploaded += 1
    except (ValueError, OSError, KeyError, TypeError, json.JSONDecodeError):
        cleanup_created(base, key, created)
        raise
    print(json.dumps({"archiveBundleVerified": True, "pdfs": len(artifacts), "uploaded": uploaded}))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, KeyError, TypeError, json.JSONDecodeError):
        print("ARCHIVE_FAILED", file=sys.stderr)
        sys.exit(1)
