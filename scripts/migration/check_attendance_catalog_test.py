#!/usr/bin/env python3
"""Verify byte-preserving catalog evidence without connecting to a database."""
import base64
import hashlib
import json
from pathlib import Path

folder = Path(__file__).resolve().parents[2] / 'docs/releases/security-closure'
rows = json.loads((folder / 'attendance-catalog-exact.json').read_text())
expected = json.loads((folder / 'attendance-expected.json').read_text())
originals = {v['name']: v['definition'] for v in json.loads(
    (folder / 'production-attendance-security.json').read_text())}
rollback = (folder / 'attendance-rollback.sql').read_bytes()
assert len(rows) == len(expected) == len(originals) == 2
for row in rows:
    definition = base64.b64decode(row['definition_base64'])
    assert hashlib.sha256(definition).hexdigest() == row['sha256'] == expected[row['name']]
    assert definition.decode() == originals[row['name']]
    assert definition.rstrip() + b';' in rollback
    # HTML result cells collapse these bytes; the archive must retain them.
    assert b'\r\n  ' in definition
print('ATTENDANCE_CATALOG_EXACT_BYTES_PASS')
