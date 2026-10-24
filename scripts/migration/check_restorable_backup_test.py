"""Focused checks for the protected Production backup gate."""

import unittest
from datetime import datetime, timedelta, timezone

from check_restorable_backup import validate_backup_reference


class BackupReferenceTests(unittest.TestCase):
    now = datetime(2026, 10, 24, 12, 0, tzinfo=timezone.utc)
    recent = "2026-10-24T05:25:39Z"

    def test_recent_timestamp_without_id(self):
        validate_backup_reference(self.recent, "", self.now)

    def test_recent_offset_timestamp_with_valid_id(self):
        validate_backup_reference("2026-10-24T00:25:39-05:00", "physical-backup-123", self.now)

    def test_missing_timestamp(self):
        with self.assertRaisesRegex(ValueError, "BACKUP_TIMESTAMP_REQUIRED"):
            validate_backup_reference("", "", self.now)

    def test_stale_timestamp(self):
        with self.assertRaisesRegex(ValueError, "FRESH_BACKUP_REQUIRED"):
            validate_backup_reference((self.now - timedelta(hours=24, seconds=1)).isoformat(), "", self.now)

    def test_future_timestamp(self):
        with self.assertRaisesRegex(ValueError, "FRESH_BACKUP_REQUIRED"):
            validate_backup_reference((self.now + timedelta(seconds=1)).isoformat(), "", self.now)

    def test_malformed_timestamp(self):
        with self.assertRaisesRegex(ValueError, "BACKUP_TIMESTAMP_INVALID"):
            validate_backup_reference("tomorrow", "", self.now)

    def test_timestamp_without_timezone(self):
        with self.assertRaisesRegex(ValueError, "BACKUP_TIMESTAMP_TIMEZONE_REQUIRED"):
            validate_backup_reference("2026-10-24T05:25:39", "", self.now)

    def test_malformed_provided_id(self):
        with self.assertRaisesRegex(ValueError, "BACKUP_ID_INVALID"):
            validate_backup_reference(self.recent, "bad id", self.now)


if __name__ == "__main__":
    unittest.main()
