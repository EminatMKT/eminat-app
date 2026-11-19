# Meta Connection Management recovery — Phase 1

## Baseline and audit

Recovery date: 2026-11-18. Fresh branch `feat/meta-connections-recovery-phase1` starts at
current `main` **4fcd1c82a96a8d080c83730da4fe374323800cb1**. Source PR #203 head:
`6764beffb931833ee02f259999825b3554bcf9a1`. PR #198 head:
`7f9cd5f8c72304adf8c5d29cd11093168981ce03` was examined for scope only; none of its
EMC Lead Ads changes was incorporated. Neither existing PR was merged or edited.

The reusable #203 changes apply cleanly to current main. Current main's Tasks, shared code,
agent restrictions, dependencies and workflows are retained. The #203 workflow change is
excluded. Existing Social storage/routes/UI, Sales identity/membership/capabilities, explicit
company access and the AES-256-GCM token vault are reused.

## Recovered behavior and review findings

- Active organization and Sales administrator membership, active user/company, explicit company
  access and an approved organization/company binding are independently required. No inferred
  ownership, company grants, provider enablement or EMC-specific IDs are introduced.
- OAuth state hashes bind the deployment/callback/credential provenance and requester/company;
  atomic claim prevents replay. Discovery returns Pages and optional linked Instagram metadata.
  Candidate, grant and selected tokens are encrypted with tenant and record-bound context.
- Multiple companies/assets are supported. Global asset reservations prevent duplicate cross-tenant
  claims and survive local disconnect. Reconnect replaces provenance and disables omitted assets.
- Read-only provider health checks distinguish revocation, lost permissions/assets and outages;
  local disconnect clears credentials without claiming provider cleanup or revoking a shared principal.
- Webhook ingestion, retry worker and receive/retry SQL RPCs are fenced. Legacy subscription RPC
  access is revoked. The Graph adapter additionally rejects direct `subscribePage` calls before
  making a provider request (a defense added in this recovery).
- There is no Lead Ads ingestion, messaging or Google Ads implementation in this recovery.
  Existing dormant parsing infrastructure on main is retained; no activation occurs.
- Preview approval records remain empty. This branch does not authorize any live QA target.
  `vercel.json` already disables branch deployments (`**: false`, main only); it is unchanged.

## Migration precheck, rollback and verification

Prepared, **not executed**:

- Read-only precheck: `supabase/prechecks/20261031190000_meta_connection_management.sql`.
  Checks prerequisite RPCs/access schema, RLS, receipt references, already-applied state and
  legacy Meta connections. Existing Meta rows deliberately stop migration for separate review.
- Migration: `supabase/migrations/20261031190000_meta_connection_management.sql`. SHA-256: `c93863b1e2a059ec90e45a74bb220ff3c1557c33d7341813ae1e63f3796323a2`.
  Transactional DDL with a five-second lock timeout; no bindings, credentials, subscriptions or
  provider enablement are seeded. Pending pre-v2 handoffs must restart.
- Read-only verification: `supabase/checks/20261031190000_meta_connection_management.sql`.
  Checks RLS/table and RPC ACLs, legacy RPC disablement, rollback definition backup,
  ingestion fences, empty retry claims and absence of subscribed Meta assets.
- Guarded empty rollback: `supabase/rollback/20261031190000_meta_connection_management.sql`.
  SHA-256: `caa19bce812b5010d0ae30c89e2945781d98e9f905d1848d791f7e6ec2f36aa8`. The emptiness check is serialized with connection writes.
  It refuses populated bindings/grants/integrations/discoveries/reservations and incompatible
  handoff statuses. Populated rollback requires a separately reviewed retention/credential plan;
  preserve history, reservations and ingestion fences. Do not drop acquired data or restore
  the old ingestion receiver on a populated installation.
- Fixture SQL moved to `scripts/qa/meta-connection-management.sql` so it cannot be mistaken
  for read-only operational verification. Existing Social rehearsal routes to it; the isolated
  runner now includes precheck, verification, empty rollback and reapply.

No database statement was executed for this task. Applying migrations, RLS behavior, populated
rollback rejection, full migration ordering and SQL authorization/lifecycle scenarios need
execution in an authorized disposable test database before sign-off. The current task expressly
prohibits database writes; even temporary transactional fixtures were not run. No deployment or
production action is requested or authorized by these instructions.

## Validation on the recovery branch

| Check | Result |
| --- | --- |
| Full unit regression (mocked databases/providers) | PASS — 3,213 tests, 761 files |
| Final targeted Social/OAuth/tenant/company/isolation/webhook/recovery tests | PASS — 108 tests, 13 files |
| Synthetic Meta browser selection, disconnect, organization switch | PASS — 2/2, English desktop and Spanish mobile |
| TypeScript | PASS |
| Next lint | PASS — existing unrelated warnings |
| CSS lint | PASS |
| Optimized local build, dummy database bindings | PASS — existing unrelated lint warnings |
| Dropped-column migration static guard | PASS |
| Diff whitespace and staged i18n guard | PASS |
| Python isolated-runner syntax | PASS |
| Live migration/RLS/SQL authorization/down/reapply and DB-backed general E2E | NOT RUN — database-write restriction |
| Centinela context/sweep | NOT VERIFIED — plugin absent; repository wrapper reports this explicitly |
| Exact-head CI | Pending new draft PR; prior #203 results are historical only |

The initial build could not fetch Google Fonts under restricted network; the retry with public
font downloads allowed passed. Local runners used the existing #203 dependency installation;
no lockfile or package change was made. The pnpm launcher attempted registry supply-chain checks
and was unable to resolve the registry under restricted network; installed test binaries were
used directly. CI's frozen installation remains required for exact-lockfile confirmation.

## Remaining blockers and review status

Technical sign-off: **NO**, pending SQL migration/RLS/authorization/rollback/full-chain testing,
DB-backed general E2E, exact-head CI and unavailable local context/sweep verification. Synthetic
browser tests mock Social endpoints: they verify UI behavior, not a live OAuth exchange or RLS.
No old PR test result substitutes for testing this branch.

Live QA/release remains blocked on separately reviewed existing isolated target and credentials,
empty approval allowlist, company mappings/access, eligible authorizers/assets, existing Meta app
callback/domain/legal settings and applicable Meta permissions/review. No live state was inspected
or changed in this task; the historical app and Instagram blockers in #203 are unverified here.
No new app, secret or credential was created, exposed or requested. No deployment, database write,
workflow modification or automatic merge was performed. This PR must remain draft.
