# Universal Meta onboarding

## Workflow and authority

Settings → Integrations → Meta → explicitly select an active organization → Manage authorized
companies → enable an already assigned company with an owner/agency declaration and acknowledgement
→ select that company → official Meta authorization → discover/filter/select eligible Pages and
optional linked professional Instagram accounts → confirm the frozen company assignment → connected.

`social/companies` is metadata-only on GET and uses a bounded strict POST body. The server resolves
the authenticated actor; the caller cannot supply an organization, member, approver or token in the
body. `native_meta_onboarding_actor` and `native_meta_manage_company` independently require active
organization/identity/membership, ADMINISTRATOR/SUPERADMIN role and the existing explicit company
assignment. Corporate admin status alone does not substitute for company access. This is an explicit
self-service authorization change: the intersection of these existing assignments now authorizes
company mapping, replacing per-connection operator SQL. It does not grant any underlying assignment.

LILLY Admin → Organization already manages the company catalog; Admin → Edit user → company access
already manages explicit assignments. Existing tenant/membership provisioning and authentication
eligibility are retained. A new company with those approvals needs no developer or SQL for Meta
mapping or connection. Matching names/codes do not confer authority.

Each mapping change records append-only actor/company/organization provenance. An owner assertion
or agency declaration is not provider-verified ownership and never transfers assets. Disabling a
mapping immediately invalidates local grants and pending handoffs through Phase 1's lifecycle;
reservations/history remain. Re-enabling requires current access and new authorization for unusable
grants. Legacy mappings can be disabled without inventing an ownership assertion.

Connections remain independent by organization/company/integration/Meta principal and authorizer.
The dashboard shows both authorizer and Meta identity, permissions, health, expiry, selected assets
and provider-versus-local cleanup. Reconnect targets its own connection's company rather than the
current selector. Asset selection remains company-bound for the entire handoff; it cannot be
reassigned by URL or completion payload. No partial asset save is claimed on a reservation conflict.

## Prepared migration and recovery

Additional migration: `20261119000000_meta_company_onboarding.sql`, after the unchanged Phase 1
migration. Matching read-only precheck/postcheck and guarded rollback are under `supabase/prechecks`,
`supabase/checks` and `supabase/rollback`. No company mappings, users, access grants, providers,
credentials or subscriptions are seeded by the migration. The new history table has RLS and no
browser privileges; service access is SELECT/INSERT only. RPCs are service-only. Actor and company
assignment rows are locked and mutations serialized per organization/company.

The down script refuses any recorded onboarding history. With unused history it removes only the
new RPCs/table, retaining existing mappings, access, grants, assets and reservations. Populated
installations require a separately reviewed application/credential retention plan; never delete
history or restore ingestion. The original Phase 1 down script is usable only after the unused
onboarding rollback and its own empty-schema checks. No shared/remote migration was applied.

## Validation

- Full unit regression: 3,303 tests / 763 files passed, including 64 destructive-fixture safety tests
  and 26 onboarding/HTTP authorization/input/error tests.
- TypeScript, changed-file ESLint and full Next lint/CSS lint passed (existing unrelated warnings).
- Optimized build with dummy bindings passed. Repository guard checks passed (300 tests plus
  guard TypeScript); no guard settings changed. Local Centinela remains unavailable and is not
  represented as passed. The pnpm launcher required registry access for its existing dependencies.
- Four synthetic browser scenarios passed: English desktop and Spanish mobile selection/disconnect,
  independent identities/reconnect targeting/origin denial, and company enable/disable with required
  agency acknowledgement. Width checks and screenshots were inspected. Provider traffic is blocked.
- Disposable PostgreSQL 17 rehearsal passed actual Sales/Social DDL, onboarding authorization,
  browser ACLs, disabled company/role/foreign tenant/company/access denials, credential invalidation,
  retained reservations, clean rollback/reapply and actual populated rollback refusal with unchanged
  history fingerprints. This uses a fresh private UNIX socket cluster with TCP disabled.
- Two additional real PostgREST E2E scenarios exercise company discovery and rejected mutations.
  The four original authorizer/isolation regressions and guarded cleanup are retained. Full-chain
  Supabase/real PostgREST execution remains the existing exact-head CI gate (no local Docker).
- No workflow, deployment configuration, guard, OAuth/encryption service or cleanup-guard changes.
  Exact pushed SHA/check evidence is recorded in the PR conversation rather than inferred here.

## Controlled live QA remains separate

No live QA environment is approved; the allowlist stays empty. The unclassified existing dev
project is excluded and unchanged. A clean isolated target and credentials, separate QA vault key,
reviewed expiring approval, exact protected Preview/callback, target migration/recovery procedure,
eligible Meta app-role authorizers and explicitly authorized company are prerequisites. Platform
public-customer onboarding additionally needs applicable Meta permissions/review/verification.
No new Meta app, paid resource, deployment, merge, live consent or Production change is authorized
by this implementation. Lead Ads, messaging, Google Ads and LinkedIn remain future phases; HTTP,
worker and SQL ingestion/subscription fences are preserved.
