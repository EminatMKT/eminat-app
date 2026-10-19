#!/usr/bin/env python3
"""Synthetic, offline validation of the private historical PDF archive gate."""

import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest


script = Path(__file__).with_name("archive-annie-membership-pdfs.py")
spec = importlib.util.spec_from_file_location("archive_annie_pdfs", script)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

ORG = "30000000-0000-4000-8000-000000000001"
MEMBERSHIP = "40000000-0000-4000-8000-000000000001"
PDF = b"%PDF-1.4\nsynthetic fixture only\n%%EOF"


class ArchiveBundleTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.directory = Path(self.temp.name) / ".local" / "bundle"
        (self.directory / "pdfs").mkdir(parents=True)
        rows = (
            json.dumps({"table": "sales_organizations", "row": {"id": ORG}}) + "\n" +
            json.dumps({"table": "sales_memberships", "row": {"id": MEMBERSHIP,
                                                           "organization_id": ORG}}) + "\n"
        ).encode()
        (self.directory / "rows.ndjson").write_bytes(rows)
        name = f"{MEMBERSHIP}-membership.pdf"
        (self.directory / "pdfs" / name).write_bytes(PDF)
        self.manifest = {"rowsSha256": hashlib.sha256(rows).hexdigest(), "pdfArtifacts": [
            {"membershipId": MEMBERSHIP, "kind": "membership", "filename": name,
             "bytes": len(PDF), "sha256": hashlib.sha256(PDF).hexdigest()}]}

    def tearDown(self):
        self.temp.cleanup()

    def test_valid_private_bundle(self):
        organization, artifacts = module.checked_artifacts(self.directory, self.manifest)
        self.assertEqual(organization, ORG)
        self.assertEqual(len(artifacts), 1)

    def test_tampering_and_path_substitution_fail_closed(self):
        (self.directory / "pdfs" / f"{MEMBERSHIP}-membership.pdf").write_bytes(PDF + b"tampered")
        with self.assertRaisesRegex(ValueError, "ARCHIVE_PDF_HASH_INVALID"):
            module.checked_artifacts(self.directory, self.manifest)
        self.manifest["pdfArtifacts"][0]["filename"] = "../outside.pdf"
        with self.assertRaisesRegex(ValueError, "ARCHIVE_ARTIFACT_INVALID"):
            module.checked_artifacts(self.directory, self.manifest)


if __name__ == "__main__":
    unittest.main()
