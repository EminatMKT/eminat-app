# Staging deployment, backup and rollback plan

Status: preparation only. Neither staging destination nor access has been verified.
No DNS, VPS, Nginx, production deployment, account, payment or production data changes
were performed for this work.

## Proposed targets and observed boundaries

| Component | Proposed staging destination | Observed local configuration | Gate |
|---|---|---|---|
| LILLY CRM/API | staging.stratixsolutions.us | Next.js 14, Supabase, Vercel configuration, main-only deployment | Confirm actual hosting and existing staging first |
| Corazón Salud Portal | staging.portal.corazonsalud.health | Separate Next.js 16 app, server-to-server LILLY Patient API | Confirm current runtime/proxy and existing staging first |
| Auth/database | Dedicated isolated Supabase-compatible services | Staff and Patient share the current LILLY Auth project through separate sessions | Dedicated staging Auth and DB; no production keys or identities |
| Billing | Disconnected providers or approved sandbox | Existing QBO workflows retained for paid memberships | No production credentials or real charges |
| Mail | Test sink/recipient allowlist | Existing encrypted outbox and allowed-link renderer | No real member invitations or notifications in staging |

LILLY repository instructions describe local and production tiers, with no confirmed hosted
staging tier. Vercel Preview pointing to production is not an acceptable substitute. Do not
assume the proposed VPS destinations mean LILLY currently runs on that VPS, or migrate its
hosting to satisfy the proposed hostname.

## Read-only discovery before any deployment

1. Identify authorized host/account/project access and the authoritative source revisions.
   Inspect existing VPS services, processes, container/project names and deployment records;
   identify any existing staging services before allocating another set.
2. Inspect DNS resolution and authoritative records for both proposed names, current routing,
   certificates and ownership. Read existing proxy mappings without editing them.
3. Measure available CPU, memory, disk, storage, ports and current service reservations.
   Confirm that staging cannot interrupt production workloads or unrelated applications.
4. Verify current production architecture from deployment records, service configuration and
   version identifiers; do not copy or print secrets or inspect real patient rows.
5. Confirm isolated staging database/Auth endpoints, credentials, callback origins, redirect
   allowlists, session cookie domains, email sink and sandbox billing configuration.
6. Record the findings and choose reuse of an existing isolated staging environment when
   available. If routing or infrastructure changes are needed, prepare a separate scoped
   change for review. Do not edit production Nginx configurations or unrelated deployments.

## Compatibility gates before hosted staging

The current Portal production origin and API allowlists deliberately recognize the existing
production hosts only. Its production bundle rejects the loopback/local adapter. LILLY's
current tier validator also has no hosted staging tier. Before deployment, review an explicit
staging configuration covering these boundaries together: `env.client.ts`, Portal
`api/mode.ts`, `auth/origin.ts`, Auth redirects and the mail link renderer. Do not loosen
allowlists broadly, pretend a hosted staging database is the existing local tier, or label
staging as production just to pass validation. These changes are not made here because the
staging targets and access are unverified.

Create dedicated staging credentials and synthetic accounts for administrator, ordinary
administrator, seller, finance, auditor and patients in separate organizations. Never seed
staging from a production patient dump. Use the reviewed application migration baseline,
then the new migration through the established release process. Existing fixture helpers
that require GitHub-hosted local provenance must not be repointed to a hosted database.

## Local feature configuration

Schema must be present before deploying the new Patient membership read projection.
Activation has three gates: server `LILLY_COMPLIMENTARY_ENABLED=true`, public CRM build switch
`NEXT_PUBLIC_LILLY_COMPLIMENTARY_ENABLED=true`, and enabled organization settings saved by an
active Sales administrator. Configure the service's IANA timezone explicitly; every
benefit stores its own timezone. Existing benefits retain their timezone after a settings change.

`COMPLIMENTARY_PORTAL_ORIGIN` is the trusted Portal origin for invitations/notification links.
Existing Patient API organization/owner configuration, verified Auth signup, encrypted email
outbox settings and secure Patient sessions remain in use. An assigned code plus the verified
matching email can bind the existing contact. An unassigned code requires an existing profile.
No account or password is generated or emailed by this feature.

Invitations include the one-time access secret in a URL fragment; the fragment is removed from
browser history on reading. Credential creation/verification uses the existing registration
flow. A beneficiary keeps the code while verifying email and enters it on sign-in or in My
membership. An ambiguous identity requires review. Mail failures never reverse a committed
membership; the CRM shows delivery status and returns the one-time code for secure handling.

The notification processor is POST `/api/sales-native/complimentary/process` with a separate
`LILLY_COMPLIMENTARY_WORKER_SECRET`. No scheduler is installed by this delivery. After environment
verification, use the approved scheduler to call this endpoint periodically and the existing
Patient mail outbox worker. It handles up to 200 previously unqueued reminders per call; repeat
as needed for a larger batch. Rate counters remain bounded to authenticated identities, not
attacker-supplied code guesses. Notification failures do not affect coverage enforcement.

Default term visit allowances reuse the existing 3/6/12-month catalog. SUPERADMIN custom terms
use the plan's existing 12-month included-visit allowance and its unchanged visit fee; they do
not prorate or change any paid price. Confirm this custom-term policy during business review.
Complimentary benefits apply to an individual; paid family coverage remains unchanged.

## Validation after an isolated staging environment is verified

Run real staff/Patient authentication and registration, email verification, existing/new member
redemption, direct activation and invitation linking for each plan and term. Check cross-tenant
and nonadministrator denials, wrong beneficiary, invalid/future/expired/revoked/reused codes,
concurrent requests and idempotent retries. Exercise custom-term authorization, extensions,
suspension, revocation, expiry across timezones and reminders against the mail sink. Verify
membership dashboard and PDF labels, code registry, history and reporting. Record exact
application revisions, migration version, timestamps and sanitized screenshots/request IDs.

Compare paid records and financial totals before/after. Re-run existing checkout, agreement,
invoice, reconciliation, renewal and family tests with stubs or approved sandbox credentials.
Prove no courtesy generates a payment, QBO job/invoice, recurring subscription or paid sale.
Perform a complete Portal → LILLY → database integration run: the local browser stub and
isolated PostgreSQL tests are separate evidence, not a replacement for that run.

## Backup and release ordering

Before any approved migration, record a restorable provider snapshot/backup, schema version,
application revisions, row/financial counts and a successful restore rehearsal to an isolated
target. Encrypt backups and retain history/code digests without plaintext code exports.

Run the committed read-only precheck. Stop on any baseline drift. Release the schema before
compatible application versions, run the committed read-only checks, then enable the feature
only in the verified staging organization. Preserve the previous compatible artifacts and
configuration. Repository policy requires reviewed PR/release handling for production; this
plan does not authorize a direct production migration or deployment.

## Rollback

Disable new issuance/redemption using the feature controls while retaining funding-aware
coverage reads. Existing coverage expiration, suspension and revocation must remain enforced.
Roll back to a compatible application revision; do not blindly restore an older Portal that
mislabels courtesy coverage as paid. Preserve the dedicated database guards against billing.

The supplied SQL rollback permits removal only while authorization/event history is empty.
After any benefit history exists it deliberately fails, preserving membership/audit/code
relationships. Use application rollback with schema retained or a separately reviewed forward
repair. Never delete benefits, fabricate payments, or reapply a paid-only active-membership
constraint over populated courtesy coverage. Provider backup restore is a disaster-recovery
operation requiring separate reconciliation of intervening records, not the default rollback.

## Authorized isolated Intuit Development regression

LILLY Membership Staging is a separate Development app, authorized for existing sandbox
`9341458451286187`. ANNIE's OAuth grant and credentials are never reused. Its callback is
`https://staging.stratixsolutions.us/api/sales-native/quickbooks/oauth/callback`.
The approved staging secret store is `/srv/corazon-complimentary-staging/secrets/lilly-intuit-development/`;
files remain root-only and are never committed or logged.

The sandbox adapter requires staging tier, the dedicated Supabase branch, explicit sandbox
mode and the fixed company. It rejects Production credential names, pins the sandbox API host,
rejects redirects, and seals tokens in a distinct environment context. Stage-only state and
connection RPCs are in `supabase/staging/20261124000000_qbo_isolated_sandbox_connection.sql`.
They require a trusted branch attestation and must **not** be applied to Production. Original
Production functions are preserved. Apply the supplied precheck/check/rollback files through
the isolated staging procedure; retain consumed OAuth/audit history when rolling back code.

A staging-only systemd timer calls the existing authenticated complimentary processor every
five minutes. It receives only its dedicated worker credential, has restricted network access,
and stops API work at the original staging allocation deadline. Production scheduling still
belongs to the protected release process; this staging timer changes no Production unit.
