#!/usr/bin/env python3
"""Fail-closed restore connection validation tests."""

import importlib.util
from pathlib import Path
import unittest


spec = importlib.util.spec_from_file_location(
    "restore_verifier", Path(__file__).with_name("verify-isolated-restore.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class RestoreConnectionTests(unittest.TestCase):
    def test_accepts_separate_direct_project(self):
        ref = "abcdefghijklmnopqrst"
        env = module.connection(f"postgresql://limited:synthetic@db.{ref}.supabase.co:5432/postgres", ref)
        self.assertEqual(env["PGUSER"], "limited")
        self.assertIn("default_transaction_read_only=on", env["PGOPTIONS"])

    def test_rejects_wrong_project(self):
        with self.assertRaisesRegex(ValueError, "RESTORE_PROJECT_MISMATCH"):
            module.connection("postgresql://limited:synthetic@db.ruedelunbtaomhrzgelc.supabase.co:5432/postgres",
                              "abcdefghijklmnopqrst")

    def test_rejects_loopback(self):
        with self.assertRaisesRegex(ValueError, "RESTORE_PROJECT_MISMATCH"):
            module.connection("postgresql://limited:synthetic@localhost:5432/postgres",
                              "abcdefghijklmnopqrst")


if __name__ == "__main__":
    unittest.main()
