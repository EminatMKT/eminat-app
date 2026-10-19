"""Native Sales schema inventory and Production database connection gate."""

import os
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


def connection_environment(url: str) -> dict[str, str]:
    if os.environ.get("LILLY_SALES_TARGET_ENV") != "production":
        raise ValueError("PRODUCTION_ENVIRONMENT_REQUIRED")
    parsed = urlparse(url)
    if parsed.scheme not in {"postgres", "postgresql"} or not parsed.hostname or not parsed.username or not parsed.password:
        raise ValueError("PRIVATE_DATABASE_HANDOFF_INVALID")
    if parsed.hostname in {"localhost", "127.0.0.1", "::1"}:
        raise ValueError("PRODUCTION_DATABASE_REQUIRED")
    username = unquote(parsed.username)
    direct = parsed.hostname == f"db.{PROJECT_REF}.supabase.co"
    session_pooler = parsed.hostname.endswith(".pooler.supabase.com") and \
        username.endswith(f".{PROJECT_REF}") and len(username) > len(PROJECT_REF) + 1
    if not (direct or session_pooler) or (parsed.port or 5432) != 5432 or \
            parsed.path != "/postgres" or parsed.query or parsed.fragment:
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
