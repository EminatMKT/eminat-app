"""Validate the operator-verified restorable backup reference for schema apply."""

from __future__ import annotations

import os
import re
from datetime import datetime, timedelta, timezone


def validate_backup_reference(
    backup_at_utc: str, backup_id: str = "", now_utc: datetime | None = None
) -> None:
    if not backup_at_utc:
        raise ValueError("BACKUP_TIMESTAMP_REQUIRED")
    try:
        backup_at = datetime.fromisoformat(backup_at_utc.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError("BACKUP_TIMESTAMP_INVALID") from exc
    if backup_at.tzinfo is None or backup_at.utcoffset() is None:
        raise ValueError("BACKUP_TIMESTAMP_TIMEZONE_REQUIRED")
    now = now_utc or datetime.now(timezone.utc)
    age = now.astimezone(timezone.utc) - backup_at.astimezone(timezone.utc)
    if not timedelta(0) <= age <= timedelta(hours=24):
        raise ValueError("FRESH_BACKUP_REQUIRED")
    if backup_id and not re.fullmatch(r"[A-Za-z0-9._:/-]{12,180}", backup_id):
        raise ValueError("BACKUP_ID_INVALID")


if __name__ == "__main__":
    try:
        validate_backup_reference(os.environ.get("BACKUP_AT", ""), os.environ.get("BACKUP_ID", ""))
    except ValueError as error:
        raise SystemExit(str(error)) from error
