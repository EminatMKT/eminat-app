#!/usr/bin/env python3
"""Synthetic checks for private native Sales reconciliation semantics."""

import importlib.util
import json
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).parent))
from sales_migration_common import TABLES

spec = importlib.util.spec_from_file_location("sales_reconciliation",
    Path(__file__).with_name("reconcile-annie-sales.py"))
reconciliation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reconciliation)


class ReconciliationTests(unittest.TestCase):
    def test_structural_drift_is_detected_without_emitting_values(self):
        expected = {table: [] for table in TABLES}
        lead = {"id": "lead-1", "organization_id": "org-1", "legacy_annie_id": "lead-1",
                "owner_member_id": "seller-1", "team_id": "team-1", "status": "QUALIFIED",
                "source": "QA", "archived_at": None}
        expected["sales_leads"] = [lead]
        actual = {table: [] for table in TABLES}
        actual["sales_leads"] = [{**lead, "archived": False}]
        self.assertEqual(reconciliation.differences(expected, actual), {})
        actual["sales_leads"][0]["owner_member_id"] = "seller-2"
        self.assertEqual(reconciliation.differences(expected, actual), {"sales_leads": 2})

    def test_numeric_formatting_is_semantically_equivalent(self):
        source = {"id": "payment-1", "amount": "49.90", "currency": "USD"}
        target = {"id": "payment-1", "amount": 49.9, "currency": "USD"}
        self.assertEqual(reconciliation.project("sales_payments", source),
                         reconciliation.project("sales_payments", target))

    def test_deferred_primary_account_is_included(self):
        lines = [json.dumps({"table": "sales_contacts", "row": {"id": "contact-1"}}),
                 json.dumps({"table": "__post_contact_primary", "row": {
                     "contact_id": "contact-1", "primary_account_id": "account-1"}})]
        rows = reconciliation.source_rows(lines)
        self.assertEqual(rows["sales_contacts"][0]["primary_account_id"], "account-1")
        lines[-1] = json.dumps({"table": "__post_contact_primary", "row": {
            "contact_id": "missing", "primary_account_id": "account-1"}})
        with self.assertRaisesRegex(ValueError, "SOURCE_CONTACT_LINK_MISSING"):
            reconciliation.source_rows(lines)
        lines[-1] = json.dumps({"table": "__post_contact_primary", "row": {
            "contact_id": "contact-1", "primary_account_id": "account-1"}})
        with self.assertRaisesRegex(ValueError, "SOURCE_CONTACT_LINK_DUPLICATE"):
            reconciliation.source_rows(lines + [lines[-1]])


if __name__ == "__main__":
    unittest.main()
