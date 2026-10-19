#!/usr/bin/env python3
"""Invoke the two exact owner-approved bindings through a guarded RPC.

Only the existing protected service-role secret reaches this process. No
credential, response body, identity row, or upstream error is printed.
"""

import argparse
import json
import os
import sys
from urllib import error, request

URL = (
    "https://ruedelunbtaomhrzgelc.supabase.co/rest/v1/rpc/"
    "native_sales_controlled_binding"
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--binding", choices=("seller", "superadmin"), required=True)
    parser.add_argument("--phase", choices=("check", "apply", "verify"), required=True)
    args = parser.parse_args()
    key = os.environ.get("LILLY_SUPABASE_SERVICE_ROLE_KEY", "")
    if not key:
        raise ValueError("MISSING_PROTECTED_SERVICE_KEY")
    payload = json.dumps({"requested_binding": args.binding, "action": args.phase}).encode()
    req = request.Request(
        URL,
        data=payload,
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=30) as response:
            result = json.load(response)
    except (error.HTTPError, error.URLError, TimeoutError, OSError, ValueError):
        raise ValueError("NATIVE_SALES_BINDING_RPC_FAILED") from None
    if result != f"NATIVE_SALES_BINDING_{args.phase.upper()}_PASS":
        raise ValueError("NATIVE_SALES_BINDING_RESULT_INVALID")
    print(f"NATIVE_SALES_{args.binding.upper()}_{args.phase.upper()}_PASS")


if __name__ == "__main__":
    try:
        main()
    except ValueError:
        print("NATIVE_SALES_BINDING_FAILED", file=sys.stderr)
        sys.exit(1)
