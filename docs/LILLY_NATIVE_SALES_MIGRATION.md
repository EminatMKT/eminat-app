# ANNIE to LILLY native Sales migration gate

This is the migration contract for draft PR #120. No Production native Sales migration or data copy has run. The source inventory came from the owner-triggered, read-only ANNIE workflow run `39186885980` against release `2026.10.18-lilly-sales-absorption-959be75`. Counts are aggregates; the workflow emitted no customer rows.

A second owner-triggered guarded workflow, run `39187743682`, produced an encrypted row snapshot from the same ANNIE release. The decrypted copy remains local, permission 600, outside Git. It confirmed the counts below and showed zero unresolved source relationships in the checked tables. It also identified two tasks and one meeting without a CRM parent; native general tasks now have a scoped activity path, while the meeting relationship must be preserved during import. No destination import or Production change has occurred.

Read-only LILLY Production SQL Editor verification on 2026-10-18 confirmed `public.sales_organizations` is not yet deployed. The legacy `annie_sales_user_mappings` table exists with two active, explicitly approved external Sales entitlements and three revoked company-tenant mappings. The two active LILLY profiles are one EMINAT-affiliated global admin and one STRATIX-affiliated seller. These existing entitlements are evidence for a separate native binding review; no native Sales organization, membership, or user permission was created during this check.

## Source inventory

| ANNIE domain | Source count | LILLY destination |
| --- | ---: | --- |
| Organization | 1 | `sales_organizations` |
| Active staff memberships | 12 | `sales_members` after explicit LILLY identity binding |
| Sales teams | 2 | `sales_teams`, `sales_team_members` |
| Leads | 17, including 1 archived | `sales_leads` |
| Contacts | 18 | `sales_contacts` |
| Accounts | 12 | `sales_accounts` |
| Account–Contact links | 6 | `sales_account_contacts` |
| Opportunities | 13: 9 won, 1 lost, 3 open | `sales_opportunities` |
| Opportunity–Contact links | 6 | `sales_opportunity_contacts` |
| Sales payments | 6 | `sales_payments`, historical evidence only |
| Program memberships | 8, all demo | `sales_memberships`, `sales_household_members` |
| Membership periods | 11 | `sales_membership_periods` |
| Tasks / meetings | 3 / 3 | `sales_activities` / `sales_meetings` |
| Meta connections | 0 | No live Social credential transfer |

Leads by status: NEW 10, ASSIGNED 1, CONTACTED 1, QUALIFIED 3, PAYMENT_PENDING 2. Opportunities must be reconciled by ANNIE Stage `outcome`, not a separately computed Won/Lost count.

## Exact mapping rules

1. Preserve each ANNIE UUID in the destination's `legacy_annie_id` (or `legacy_annie_principal_id` for staff). Generate a separate LILLY UUID only when needed. Reject a second source record with the same `(organization_id, legacy_annie_id)`.
2. Bind ANNIE `Principal` + `Membership` to an existing LILLY Supabase `auth.users` + `usuarios` pair only through an explicit reviewed mapping. Never match by email alone. Do not invent users or assign an unmatched seller's records to another seller. Keep the ten unmapped staff as historical-only actors under the owner's decision; review only the existing controlled SUPERADMIN and `marketing@eminat.net` bindings for active access.
3. Map ANNIE `Organization`, `SalesTeam`, `MembershipTeam`, `Pipeline`, and `Stage` first. Normalize Stage outcome `open`/`won`/`lost` to LILLY `OPEN`/`WON`/`LOST`; retain ANNIE Stage IDs for exact stage attribution.
4. Load Accounts, Contacts, Account–Contact links, Leads, Opportunities, Opportunity–Contact links, SalesPayment, ProgramMembership, MembershipPeriod, household links, tasks, meetings, and relevant history in dependency order. Preserve archived state and source timestamps. Reject missing foreign keys instead of silently dropping relationships.
5. `ProgramMembership` rows with NULL plan, duration, or price fields are historical records. Six of eight currently have NULL plan, duration, monthly price, total price, visit fee, and included visits. Preserve NULL prices and use `LEGACY_UNSPECIFIED` only as a normalized classification, with the original ANNIE plan/type/duration/modality retained in dedicated legacy label columns. Historical `2M` remains readable; neither it nor `LEGACY_UNSPECIFIED` is available to new issuance.
6. ANNIE membership type values currently include `Individual`, `Atención Médica Familiar`, `Preventiva`, and two combined plan/type labels. Only unambiguous, explicitly reviewed values may normalize to `INDIVIDUAL` or `FAMILY`; otherwise classify as `LEGACY_UNSPECIFIED` and preserve the original label. Do not infer Family coverage from a marketing name.
7. Two historical memberships have no `SalesPayment` reference. Preserve that absence under the legacy exception. Do not fabricate a payment, price, plan, or receipt. The new-sale one-primary-per-payment rule still applies to all LILLY-issued memberships.
8. ANNIE MembershipPeriod plan/duration/modality `LEGACY` values must retain their original labels. Eleven period rows must reconcile independently of the eight membership rows.
9. Meta Production credentials, QuickBooks Production credentials, Stripe configuration, provider secrets, and real payment activation are outside this transfer. MetaConnection count is zero in the verified ANNIE inventory.

## Identity and transfer blockers found in the encrypted snapshot

- ANNIE contains 28 staff membership records; 12 are active. The current LILLY Production Sales mapping has only two active entries. Five active ANNIE staff logins have no same-login LILLY profile, and several of the matching profiles belong to other LILLY companies. A same-login match is evidence for review, not authorization to grant STRATIX access. Never bind these users across company boundaries automatically.
- Commercial rows reference seven distinct ANNIE staff actors. Preserve each original actor and owner reference, including inactive historical staff, without fabricating a Supabase login or assigning their records to another person. The native schema now supports non-login `historical` members with a legacy Principal ID and display name; they cannot authenticate or receive new work. Explicit, reviewed identity mapping is still required to activate any such member or make their records Seller-accessible.
- Owner decision: keep the ten active ANNIE staff without an approved same-company LILLY binding as historical-only actors at cutover. Do not invite, activate, or cross-company-map them. The two existing controlled LILLY mappings are reviewed separately for access, and imported record ownership remains attributed to the original ANNIE actor.
- All eight demo memberships have PDF bytes and two have agreement PDF bytes. Encrypted export protects transit, but a reviewed private storage transfer, content hash reconciliation, and browser view/download checks are required before claiming PDF parity. These binaries must not enter Git or logs.
- The source has no renewal notices or membership-delivery rows. No absent record should be fabricated.
- One source meeting has status `NO_SHOW`. The native meeting status constraint now retains it exactly; no-show meetings must not be silently relabeled as cancelled.

## Private transfer rehearsal

`scripts/migration/prepare-annie-sales.py` converts the encrypted export after private decryption into a permission-600 bundle under an ignored `.local` directory. It preserves ANNIE UUIDs as destination IDs and `legacy_annie_id` values; 28 staff actors are staged as non-login historical identities. The organization remains `pending`, so the bundle grants no Sales access. Ten PDF artifacts have independent content hashes. No provider credentials are included.

`scripts/migration/validate-annie-sales-bundle.py` checks the bundle and emits a rollback-only SQL rehearsal. Against the disposable local PostgreSQL test database, all 334 normalized rows loaded with source references and destination constraints intact, then rolled back. The rows include 160 CRM/audit history events and 11 deferred Contact primary-account links. This validates structure, not Production cutover. Final identity activation, private PDF storage transfer, destination backup, and source/destination reconciliation still require guarded release steps.

`scripts/migration/import-annie-sales.py` is the separate Production import utility prepared for a later guarded release. It requires a clean exact commit and the approved row-bundle hash, refuses a non-Supabase project connection, uses verified TLS, rejects any nonempty destination Sales table, and loads the same private rows in one transaction. The imported organization stays pending and every imported staff actor stays historical, so it grants no LILLY login access. The utility does not create a backup or prove restore readiness; a fresh restorable Supabase database backup and private connection must be independently verified before `--execute`. No Production import has run.

Historical PDF preservation is staged in a separate private Storage archive. `20261019120000_native_sales_membership_archive.sql` creates a private bucket and service-role-only checksum records, with a restrictive browser-role policy. `scripts/migration/archive-annie-membership-pdfs.py` is offline by default; it verified all ten encrypted-export PDF artifacts locally without upload. A later guarded `--commit` requires the exact row-bundle hash, a private service credential, and an explicit release flag, then downloads each stored object to verify SHA-256 before recording it. Historical PDFs are audit-only because older bytes may contain contact details; the normal membership PDF route continues generating the reduced-PII card. No archive upload or Production schema change has occurred.

## Release gates

- Native CSV/XLSX imports use a 4 MB file ceiling and a 5,000-row ceiling. The 4 MB cap leaves room for multipart metadata under Vercel's 4.5 MB function request limit. Larger files require an explicitly reviewed private-storage upload path; the UI must never claim that a 10 MB serverless upload will work.
- Export only through reviewed, owner-triggered ANNIE guarded access. Encrypt private row data before transfer; never print rows, credentials, or provider tokens to GitHub logs. Verify source release SHA and export hash.
- Stage and validate in LILLY infrastructure before enabling native `/sales`. Keep ANNIE intact and current LILLY Production `/sales` on its existing path until reconciliation passes.
- Keep the server-only `LILLY_NATIVE_SALES_ENABLED` release gate unset/false while schema and data are staged. It guards native Sales UI/API, scheduled reports, and Meta webhook ingress. Turn it on only for the controlled QA window after migration review, with an exact-commit Vercel deployment; turning it off and redeploying is the non-destructive emergency containment step. The separate `LILLY_NATIVE_SALES_PRIMARY` gate switches `/sales` to native only when both flags are true. Leave that gate false until reconciliation, live role/mobile QA, and backup/rollback checks pass.
- Meta Lead Ads receipts without field data remain retryable. The service-only recovery worker leases due receipts, fetches bounded lead fields from the explicitly pinned Graph API version with a privately sealed Page/integration token, and reuses the original signed receipt for idempotent CRM ingestion. Provider failures become sanitized retry statuses. The worker remains inert without `LILLY_META_GRAPH_VERSION`, `LILLY_SOCIAL_TOKEN_KEY`, a connected asset, and the native Sales release gate. The connected Vercel team is on Hobby, so its scheduled recovery runs daily. Live Meta activation remains blocked until owner permissions and secret rotation; before activation, choose an approved faster scheduler or prove that once-daily fallback meets the operational requirement.
- The Meta connection draft uses a ten-minute, tenant-bound OAuth state. Only an authorized Sales administrator can select an existing Page and owner; provider tokens are sealed server-side and never returned to the browser. A Page may be subscribed to `leadgen` only when Meta OAuth, the webhook verifier, the required granted scopes, and the Page token are available. This code does not configure the Meta app's webhook callback, grant Page/Lead permissions, or rotate the previously exposed app secret. Keep the provider disabled and `LILLY_META_OAUTH_ENABLED` false until those owner-side steps are complete and a synthetic live Page test passes. The callback URL is `https://app.stratixsolutions.us/api/sales-native/social/meta/callback`; the webhook URL is `https://app.stratixsolutions.us/api/sales-native/social/meta/webhook`.
- A Sales administrator can revoke a connected Meta integration locally. Revocation atomically clears the stored integration and asset tokens, disables Page ingestion, and writes an audit event while retaining historical receipts and conversations. Meta-side app/Page permissions and subscriptions still require owner management in Meta after local revocation.
- An authorized administrator can refresh a still-valid Meta user grant. The server obtains fresh Page credentials, checks the required scopes and same Page identity, then atomically replaces sealed tokens and records an audit event. Expired, revoked, or permission-lost grants require a new owner OAuth handoff; the UI exposes expiry and never shows token contents.
- Expired, unconsumed OAuth grants have their sealed tokens cleared when a new connection starts and by the authenticated daily Social recovery job. The job is gated by native Sales activation; no Meta credential is logged or returned.
- Compare record counts, Lead stages, Opportunity outcomes, seller/team attribution, archived rows, links, membership codes/modalities, periods, tasks, meetings, and Social state. Every mismatch requires an explanation and reviewed disposition.
- Require exact-commit CI, migration review, LILLY database backup, verified rollback, browser QA for SUPERADMIN and Seller, health checks, and an ANNIE-outage independence test before Sales cutover.
- Do not backfill or repair ANNIE Production data as part of this migration.
