# ANNIE to LILLY native Sales migration gate

This is the migration contract for draft PR #120. No Production native Sales migration or data copy has run. The source inventory came from the owner-triggered, read-only ANNIE workflow run `39186885980` against release `2026.10.18-lilly-sales-absorption-959be75`. Counts are aggregates; the workflow emitted no customer rows.

A second owner-triggered guarded workflow, run `39187743682`, produced an encrypted row snapshot from the same ANNIE release. The decrypted copy remains local, permission 600, outside Git. It confirmed the counts below and showed zero unresolved source relationships in the checked tables. It also identified two tasks and one meeting without a CRM parent; native general tasks now have a scoped activity path, while the meeting relationship must be preserved during import. No destination import or Production change has occurred.

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
2. Bind ANNIE `Principal` + `Membership` to an existing LILLY Supabase `auth.users` + `usuarios` pair through an explicit reviewed mapping. Never match by email alone. Do not invent users or assign an unmatched seller's records to another seller. The existing controlled SUPERADMIN and `marketing@eminat.net` mappings are only the starting set; the remaining actor bindings must be reviewed before cutover.
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
- All eight demo memberships have PDF bytes and two have agreement PDF bytes. Encrypted export protects transit, but a reviewed private storage transfer, content hash reconciliation, and browser view/download checks are required before claiming PDF parity. These binaries must not enter Git or logs.
- The source has no renewal notices or membership-delivery rows. No absent record should be fabricated.
- One source meeting has status `NO_SHOW`. The native meeting status constraint now retains it exactly; no-show meetings must not be silently relabeled as cancelled.

## Private transfer rehearsal

`scripts/migration/prepare-annie-sales.py` converts the encrypted export after private decryption into a permission-600 bundle under an ignored `.local` directory. It preserves ANNIE UUIDs as destination IDs and `legacy_annie_id` values; 28 staff actors are staged as non-login historical identities. The organization remains `pending`, so the bundle grants no Sales access. Ten PDF artifacts have independent content hashes. No provider credentials are included.

`scripts/migration/validate-annie-sales-bundle.py` checks the bundle and emits a rollback-only SQL rehearsal. Against the disposable local PostgreSQL test database, all 334 normalized rows loaded with source references and destination constraints intact, then rolled back. The rows include 160 CRM/audit history events and 11 deferred Contact primary-account links. This validates structure, not Production cutover. Final identity activation, private PDF storage transfer, destination backup, and source/destination reconciliation still require guarded release steps.

## Release gates

- Export only through reviewed, owner-triggered ANNIE guarded access. Encrypt private row data before transfer; never print rows, credentials, or provider tokens to GitHub logs. Verify source release SHA and export hash.
- Stage and validate in LILLY infrastructure before enabling native `/sales`. Keep ANNIE intact and current LILLY Production `/sales` on its existing path until reconciliation passes.
- Compare record counts, Lead stages, Opportunity outcomes, seller/team attribution, archived rows, links, membership codes/modalities, periods, tasks, meetings, and Social state. Every mismatch requires an explanation and reviewed disposition.
- Require exact-commit CI, migration review, LILLY database backup, verified rollback, browser QA for SUPERADMIN and Seller, health checks, and an ANNIE-outage independence test before Sales cutover.
- Do not backfill or repair ANNIE Production data as part of this migration.
