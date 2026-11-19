# Universal Meta central navigation — review and release package

## Change and compatibility

The primary path is LILLY Settings → Integrations → Meta (`/settings/integrations/meta`).
The legacy Native Sales Meta path and OAuth return stay functional and use exactly the same
workspace, Social APIs, vault, state policy, asset reservations and lifecycle. No provider or
ingestion behavior changed. No new migration or deployment setting is introduced by this increment.

Stratix 360 → Social Media → Connected Accounts reads the existing company-filtered connection
projection. Organization selection is explicit. Each company connection displays its actual Page /
professional Instagram assets, local connection state, granted permissions and last health outcome;
unchecked grants are labeled unchecked. Manage links preserve organization/company context into
central Settings. Changing organization unmounts the prior snapshot and ignores pending responses.
Marketing module permission alone never grants access to native organization or company records.

The rail and all three central pages require an active native ADMINISTRATOR/SUPERADMIN membership.
`social/workspaces` performs existing identity/active-profile/membership/active-organization discovery
and projects only eligible organization IDs/names. Its result is navigation metadata, not a data
access grant. Every existing Social data/mutation endpoint still independently authorizes its actor
and explicit company access. Central page query parameters cannot select an unauthorized organization.
A company parameter is only an initial selector hint; backend company authorization remains mandatory.

## Validation evidence

- 18 new focused unit cases: role-filtered discovery, fail-closed identity errors, context encoding,
  common central/legacy workspace, unavailable identity/release and foreign/seller organization denial.
- 113 focused cases passed including retained destructive-fixture safety, onboarding and lifecycle
  policy cases. Existing 64 destructive fixture tests remain unchanged.
- 6 synthetic browser scenarios passed in English desktop / Spanish mobile: original onboarding,
  selection, reconnect/local disconnect plus both central Settings and Stratix paths, Page/Instagram
  display, company-preserving links, organization snapshot clearing, API denial and streamed 404 denial.
  Screenshots and horizontal overflow checks passed. No live Meta traffic is permitted by the fixture.
- A new real PostgREST test in the existing guarded suite verifies native administrator discovery,
  seller exclusion, foreign-organization query non-escalation and unauthenticated rejection. The six
  previous real PostgREST authorizer/company regressions and cleanup transport are unchanged.
- Disposable PostgreSQL 17 rehearsal passed actual Sales/Social DDL, company/tenant/OAuth/lifecycle
  denials, browser ACLs, clean rollback/reapply and populated rollback refusal with retained history.
- Final full-unit/build/lint and exact-head CI evidence is recorded in PR #209, not inferred from
  the previous head. Docker is unavailable locally; full migration chain/RLS/PostgREST gates use the
  existing four CI shards. Local Centinela is unavailable, not represented as passed.

## Release gates — currently pending

Owner functional approval was supplied with this task. It is not independent technical approval.
GitHub reviews were empty when preparation started. The final exact head needs an independent
human technical review, including the earlier self-service company authority policy and migrations.
No merge, release authorization, deployment or target migration is claimed by this document.

The complete PR retains these existing migration packages, in order:

| Migration | Precheck | Verification | Rollback |
| --- | --- | --- | --- |
| `20261031190000_meta_connection_management.sql` | `supabase/prechecks/20261031190000_meta_connection_management.sql` | `supabase/checks/20261031190000_meta_connection_management.sql` | `supabase/rollback/20261031190000_meta_connection_management.sql` |
| `20261119000000_meta_company_onboarding.sql` | `supabase/prechecks/20261119000000_meta_company_onboarding.sql` | `supabase/checks/20261119000000_meta_company_onboarding.sql` | `supabase/rollback/20261119000000_meta_company_onboarding.sql` |

Before release, the reviewed package must contain target-specific read-only precheck output,
verified migration inventory and restorable backup evidence with target reference, backup ID/time,
restoration verification and retention/access ownership. None was obtained against Production in
this task; synthetic rehearsal is not target backup evidence. The agent's migration work ends at
these committed procedures. Production changes remain subject to the repository's reviewed process.

Rollback is conditional: onboarding rollback refuses populated history and preserves existing
bindings/access/assets/reservations. Original Phase 1 rollback additionally requires its own empty
schema conditions. A populated installation needs a separately reviewed application rollback and
credential/history retention plan. Never delete audit history or release reservations to force it.

Once an authorized reviewed deployment exists, verify its exact SHA, central Settings access,
Stratix company-context links, legacy Native Sales compatibility, administrator versus seller/foreign
company denials, EN/ES desktop/mobile rendering and disabled ingestion/subscriptions. A previous
Production deployment or a green PR build is not evidence that this head is deployed.

## First controlled connection — separate operational authorization

The QA allowlist remains empty. The unclassified existing development database is excluded and
unchanged. A controlled live test still requires a clean approved isolated target, provenance-bound
non-Production credentials and separate vault key, reviewed target migration/recovery evidence,
protected exact-head callback/Preview, valid existing Meta app/eligible authorizer/Page permissions,
explicit company authorization and separate permission to initiate Page-only OAuth. No live provider
operation is authorized by dashboard sign-in, owner functional approval or this implementation.
Lead Ads, messaging, publishing, subscriptions and other providers stay disabled.
