#!/usr/bin/env python3
"""Compare read-only Production and isolated-restore metadata without row output."""

import json
import os
import re
import subprocess
import sys
from urllib.parse import unquote, urlparse

PRODUCTION_REF = "ruedelunbtaomhrzgelc"
SQL = """
SELECT json_build_object(
  'users', (SELECT count(*) FROM public.usuarios),
  'organizations', (SELECT count(*) FROM public.empresas),
  'teams', (SELECT count(*) FROM public.equipos),
  'userCompanyAccess', (SELECT count(*) FROM public.usuario_empresas_acceso),
  'salesTenantMappings', (SELECT count(*) FROM public.annie_sales_tenant_mappings),
  'nativeSalesTables', (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relname LIKE 'sales\\_%' ESCAPE '\\'),
  'publicSchema', (SELECT md5(coalesce(string_agg(
    n.nspname||'.'||c.relname||':'||a.attname||':'||
    format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull::text,
    ',' ORDER BY n.nspname,c.relname,a.attnum),''))
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
    WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m'))
)
"""


def connection(url: str, expected_ref: str) -> dict[str, str]:
    if not re.fullmatch(r"[a-z0-9]{20}", expected_ref):
        raise ValueError("RESTORE_PROJECT_REF_INVALID")
    parsed = urlparse(url)
    if parsed.scheme not in ("postgres", "postgresql") or not parsed.username or not parsed.password:
        raise ValueError("RESTORE_CONNECTION_INVALID")
    user = unquote(parsed.username)
    direct = parsed.hostname == f"db.{expected_ref}.supabase.co"
    pooler = bool(parsed.hostname and parsed.hostname.endswith(".pooler.supabase.com")
                  and user.endswith(f".{expected_ref}"))
    if not (direct or pooler) or (parsed.port or 5432) != 5432 or parsed.path != "/postgres" \
            or parsed.query or parsed.fragment:
        raise ValueError("RESTORE_PROJECT_MISMATCH")
    env = {key: value for key, value in os.environ.items() if not key.startswith("PG")}
    env.update({"PGHOST": parsed.hostname or "", "PGPORT": "5432", "PGUSER": user,
                "PGPASSWORD": unquote(parsed.password), "PGDATABASE": "postgres",
                "PGSSLMODE": "verify-full", "PGSSLROOTCERT": "system", "PGCONNECT_TIMEOUT": "10",
                "PGOPTIONS": "-c default_transaction_read_only=on -c statement_timeout=30000"})
    return env


def fingerprint(env: dict[str, str]) -> dict:
    result = subprocess.run(["psql", "-X", "-q", "-t", "-A", "-v", "ON_ERROR_STOP=1", "-c", SQL],
                            env=env, capture_output=True, text=True, check=False)
    if result.returncode:
        raise ValueError("RESTORE_READ_FAILED")
    data = json.loads(result.stdout.strip())
    for key in ("users", "organizations", "teams", "userCompanyAccess",
                "salesTenantMappings", "nativeSalesTables"):
        if type(data.get(key)) is not int or data[key] < 0:
            raise ValueError("RESTORE_FINGERPRINT_INVALID")
    if not data["users"] or not data["organizations"] or not data.get("publicSchema"):
        raise ValueError("RESTORE_FINGERPRINT_INVALID")
    return data


def main() -> None:
    restore_ref = os.environ["LILLY_SALES_RESTORE_PROJECT_REF"]
    if restore_ref == PRODUCTION_REF:
        raise ValueError("RESTORE_NOT_ISOLATED")
    production = fingerprint(connection(os.environ["LILLY_SALES_SCHEMA_ADMIN_DB_URL"], PRODUCTION_REF))
    restored = fingerprint(connection(os.environ["LILLY_SALES_RESTORE_DB_URL"], restore_ref))
    if production != restored:
        raise ValueError("RESTORE_METADATA_MISMATCH")
    if production["nativeSalesTables"]:
        raise ValueError("PRE_SCHEMA_BACKUP_REQUIRED")
    print("ISOLATED_RESTORE_METADATA_VERIFIED")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, KeyError, OSError, json.JSONDecodeError):
        print("ISOLATED_RESTORE_VERIFICATION_FAILED", file=sys.stderr)
        sys.exit(1)
