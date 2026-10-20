#!/usr/bin/env python3
"""Invoke the two exact owner-approved bindings through a guarded RPC.

Only the existing protected service-role secret reaches this process. No
credential, response body, identity row, or upstream error is printed.
"""

import argparse
import json
import os
import re
import sys
from urllib import error, request

URL = (
    "https://ruedelunbtaomhrzgelc.supabase.co/rest/v1/rpc/"
    "native_sales_controlled_binding"
)


class BindingFailure(ValueError):
    """A fixed, safe-to-log diagnostic with no upstream message or payload."""


def http_diagnostic(exc: error.HTTPError) -> str:
    upstream_code = "UNKNOWN"
    try:
        body = json.loads(exc.read(4096))
        code = body.get("code") if isinstance(body, dict) else None
        if isinstance(code, str) and re.fullmatch(r"(?:[0-9A-Z]{5}|PGRST[0-9]{3})", code):
            upstream_code = code
    except (OSError, ValueError):
        pass
    finally:
        exc.close()
    return f"NATIVE_SALES_BINDING_RPC_HTTP_{exc.code}_CODE_{upstream_code}"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--binding", choices=("seller", "superadmin"), required=True)
    parser.add_argument("--phase", choices=("check", "apply", "verify"), required=True)
    args = parser.parse_args()
    key = os.environ.get("LILLY_SUPABASE_SERVICE_ROLE_KEY", "")
    if not key:
        raise BindingFailure("MISSING_PROTECTED_SERVICE_KEY")
    # Opaque Supabase secret keys are API keys, not JWT bearer tokens.
    headers = {
        "apikey": key,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if key.startswith("sb_secret_"):
        pass
    elif key.startswith("eyJ"):
        headers["Authorization"] = f"Bearer {key}"
    else:
        raise BindingFailure("UNSUPPORTED_PROTECTED_SERVICE_KEY_TYPE")
    payload = json.dumps({"requested_binding": args.binding, "action": args.phase}).encode()
    req = request.Request(URL, data=payload, headers=headers, method="POST")
    try:
        with request.urlopen(req, timeout=30) as response:
            result = json.load(response)
    except error.HTTPError as exc:
        raise BindingFailure(http_diagnostic(exc)) from None
    except (error.URLError, TimeoutError, OSError):
        raise BindingFailure("NATIVE_SALES_BINDING_RPC_TRANSPORT_FAILED") from None
    except ValueError:
        raise BindingFailure("NATIVE_SALES_BINDING_RPC_INVALID_JSON") from None
    if result != f"NATIVE_SALES_BINDING_{args.phase.upper()}_PASS":
        raise BindingFailure("NATIVE_SALES_BINDING_RESULT_INVALID")
    print(f"NATIVE_SALES_{args.binding.upper()}_{args.phase.upper()}_PASS")


if __name__ == "__main__":
    try:
        main()
    except BindingFailure as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
