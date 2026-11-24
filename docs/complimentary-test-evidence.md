# Local verification evidence

Final LILLY delivery baseline: `origin/main` `4fcd1c82a96a8d080c83730da4fe374323800cb1`.
Portal baseline: `c265310bac3fe854f4a7d8aa897ea8e82e7c2ab8`. No unrelated Meta recovery
changes are included in this delivery. Execution date: 2026-11-23, America/Guayaquil.

## Executed checks

| Check | Outcome | Actual scope |
|---|---|---|
| LILLY Native Sales/Patient suites | 446 tests passed, 59 files | Unit, HTTP boundary, permissions, pricing, paid membership/renewal/family regression, code admission and lifecycle projection |
| Portal full unit suite | 209 tests passed, 24 files | Existing portal behavior plus complimentary server-action preview/activation, strict payloads, origin enforcement and errors |
| LILLY TypeScript and changed-file ESLint | Passed | Final source files |
| Portal TypeScript and changed-file ESLint | Passed | Final source files |
| LILLY production compilation | Passed | Local database URL and dummy credentials; existing unrelated React hook warnings remain |
| Portal production compilation | Passed with webpack | Production mode with unavailable adapter; no hosted API credentials or connection |
| Portal production bundle check | Passed | No synthetic mock-data markers in production output |
| Actual PostgreSQL rehearsal | Passed | PostgreSQL 17, newly initialized temp cluster, UNIX socket only; actual ordered Native Sales migrations with synthetic Auth/profile/storage schema |
| Migration and rollback | Passed | Precheck, migration, schema/ACL checks, empty rollback and reapply; populated rollback refuses deletion |
| Local Chrome interface checks | Passed | English preview/activation/membership/dashboard/renewal; Spanish 375px mobile, no overflow; optional onboarding code field and actual Portal login action preserving the invitation fragment; stub Patient API only; no payment/external requests |

The isolated SQL tests exercise all nine standard plan/term combinations, custom direct
activation, one-time account invitation, assigned code verification, identity reuse, preview
without mutation, duplicate benefit prevention, invalid/future/expired/reused/revoked codes,
RBAC, cross-organization denial, custom-term permission, durable admission, extension replay,
suspension/revocation, configured notification selection/suppression, waiver-only records and
separate paid revenue/sales reporting. Existing paid renewal, family, email preference and
staff onboarding SQL checks also run. A mixed paid/courtesy exercise preserves the paid row
and its financial record and rejects replacing active paid coverage with courtesy coverage.

Two independent real PostgreSQL sessions race the same code: exactly one activation commits;
the other is rejected. The final database contains one resulting membership. A populated
rollback then fails and retains history. Calendar tests cover month-end and leap-day clamping.
Exact expiry at the exclusive timestamp and suspended/revoked visibility are separately tested
at the Patient coverage boundary without depending on a background job.

The first Portal default Turbopack build could not follow shared local dependency symlinks;
the supported webpack build passed. LILLY needed access to its existing public Google font for
the build. No application dependency, font, production origin or security restriction was
changed to make a check pass. Intermittent parallel test timeouts were resolved by rerunning
the Portal suite with one worker; all 209 tests passed under that configuration.

## Reproduce locally

LILLY: run the targeted Native Sales/Patient Vitest suites, TypeScript, changed-file ESLint and
`scripts/qa/complimentary-isolated.py` from its repository. The Python runner accepts no remote
URL and creates/removes only its own temporary cluster. It never invokes a database reset.
For production compilation use the existing `.next-verify` output directory and safe local
Supabase placeholders; do not supply production credentials.

Portal: run Vitest with `--maxWorkers=1`, TypeScript, changed-file ESLint, production build
`--webpack`, then `scripts/verify-production-bundle.mjs`. Browser script requires the local
Portal on 127.0.0.1:3107 with `PORTAL_DATA_MODE=lilly` and its API base on
127.0.0.1:3108/api/patient/v1/. The browser script starts that contract stub itself and fails
if a payment or non-loopback request is observed. Synthetic screenshots are included in
Portal `docs/evidence/`.

The Portal development runtime also emitted a security advisory for its existing Next.js
version. That advisory has not been independently verified or remediated in this feature;
verify the affected version/advisory as a prerequisite to deployment. No dependency upgrade
or production configuration change was included.

## Not executed or claimed

No real GoTrue/PostgREST-to-Portal integration, invitation email delivery, notification delivery,
provider sandbox payment, verified VPS/DNS inspection, hosted staging validation, provider backup
or restore, or production deployment was performed. Local Chrome uses a contract stub while
SQL runs independently. The corresponding verified staging integration and backup evidence
remain release gates documented in `complimentary-deployment-plan.md`.
