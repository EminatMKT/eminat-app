# PR #209 independent investigation of reported boundaries

Investigation date: 2026-11-22. Application source baseline:
`fca28961d2362b0f73c6f957f7542647cb7df7cc`, compared with current fetched
`main` (`4fcd1c82a96a8d080c83730da4fe374323800cb1`). This supplement adds
regressions and documents observed boundaries; it does not claim Wagner's review
is resolved or independently approve the PR.

## Review source and search

Wagner's 2026-11-20 email, subject “Aclaración necesaria — módulo Sales/LILLY
(ubicación, usuarios y seguridad)”, names five specific tables and references
`docs/operations/pr-209-review.md`. The email is not the complete 12-finding review.
After fetching origin, path history/object searches over all available refs (187
origin refs), all three local Git worktrees, and the PR discussion found no file.
GitHub contents lookup also returned 404 on main and the PR branch. Unpushed/private
reviewer work is not accessible. No missing finding is invented or marked fixed.

## Five exact tables: actual read-only Production metadata

Observed through the existing authorized Supabase dashboard, using pg_catalog,
pg_policies and has_table_privilege inside `BEGIN READ ONLY`, a 15-second local
statement timeout and `ROLLBACK`. No application/Auth rows or credentials were read.
The transaction reported `transaction_read_only=on`.

All five tables exist, have RLS enabled, force-RLS false, zero policies, and no
SELECT/INSERT/UPDATE/DELETE privileges for either `anon` or `authenticated`.

| Table | service_role table privileges |
| --- | --- |
| sales_patient_identities | SELECT, INSERT, UPDATE, DELETE (plus other ALL privileges) |
| sales_payments | SELECT, INSERT, UPDATE, DELETE (plus other ALL privileges) |
| sales_qbo_connections | SELECT, INSERT, UPDATE, DELETE (plus other ALL privileges) |
| sales_qbo_invoice_jobs | SELECT, UPDATE |
| sales_qbo_oauth_states | SELECT, INSERT |

`service_role.rolbypassrls=true`. Its direct SQL CRUD privileges on `auth.users`
were all false; GoTrue Auth Admin HTTP access is a separate privileged path, not
direct SQL access under this role. The Meta Phase 1 tables were absent from Production.

Reproduce the metadata observation without selecting records: inspect
`pg_class.relrowsecurity`, `relforcerowsecurity`, `relacl`, `pg_policies`,
`pg_roles.rolbypassrls` and `has_table_privilege(role, table, operation)` for these
five exact table names. Do not run role-changing probes against Production.
The new guarded local PostgREST cases reproduce HTTP browser denial with both the
anonymous demo role and a synthetic authenticated Sales administrator, then confirm
service SELECT still works. Every query uses `select=id&limit=0`; no patient/payment
rows are read or written by those cases. Existing fixture setup/cleanup safeguards
remain unchanged.

## Findings and reproductions

| Issue / classification | Exact source or object and reproduction | Impact and disposition |
| --- | --- | --- |
| Missing policies mean unrestricted browser access: NOT REPRODUCED | Five tables above; `20261020010000_patient_portal_identity.sql`, Native Sales core/operations migrations, `20261022230000_native_sales_qbo_oauth_state.sql`, `20261023220000_native_sales_qbo_automatic_invoice.sql`. Repeat local PostgREST denial cases. | Zero policies default-deny non-bypass roles; browser table grants are also revoked. Do not add permissive policies. This does not prove privileged server queries are safe. |
| Broad privileged server access: ARCHITECTURAL RISK | `supabaseAdmin()`, `service_role BYPASSRLS`, above table ACLs. A privileged query with an omitted tenant filter can cross tenants. No such exploitable PR #209 path was reproduced. | This is a pre-existing trust boundary. Adding RLS policies or FORCE RLS does not constrain BYPASSRLS. A move to narrower execution roles/RPC-only grants requires a separate reviewed caller inventory and migration/recovery plan, especially for billing. No grants changed here. |
| Shared factory breaks valid module access: NOT REPRODUCED | `src/shared/db/supabaseAdmin.ts`, `assertDeploymentIsolation()` in `deployment-isolation.cjs`; run `supabaseAdmin.consumers.test.ts`. | PR adds server-only and runtime deployment isolation, preserving stateless auth and optional no-store transport. Admin/Directory/Tasks service paths work in Production, local and synthetic Preview configurations. Preview using Production or unapproved credentials intentionally fails before client creation; do not remove that fence. Actual hosted deployment configurations were not exercised. |
| Billing/Medical unexpectedly elevated: NOT REPRODUCED | `src/shared/data/billing_v2/records/index.ts`, `src/features/medical/data/pacientes.ts`; real consumer functions with mocked SDK transport in the new tests. | Primary reads remain session-bound. Permission errors do not fall back to service_role. This covers representative paths, not all mutations or live deployments. |
| Tasks/Stratix compatibility: NOT REPRODUCED | `src/app/api/tasks/dashboard/route.ts:GET`, `requireAdmin()`, `requireModule('stratix-mkt')`, `MetaConnectedAccounts.tsx`, `useMetaWorkspaces.ts`. | Tasks checks active admin then uses the caller-session metrics RPC. Stratix permission alone grants no Native Sales access. Existing widget server authorization and stale-snapshot isolation are retained; new tests cover the shared factory and module gate, not a new visual audit. |
| Shared employee/patient identity store: ARCHITECTURAL RISK | `sales_patient_identities.auth_id`, `sales_patient_sessions.auth_id` reference `auth.users`; Patient route register/login/authenticate; Portal `src/lib/api/lilly.ts` and `src/lib/api/mode.ts`. | Shared Auth is confirmed and predates #209. Corporate-domain enforcement, password/reset rules, backups and future identity separation affect both apps. A separate decision and compatibility plan are necessary; no automatic employee privilege follows from Auth registration alone. |
| Patient handle grants staff access: NOT REPRODUCED | Patient route `authenticate()`/login; Portal `src/lib/auth/patient-cookie.ts`, `src/lib/api/adapters/lilly/index.ts`, `src/app/login/lilly-actions.ts`. Local Portal snapshot `c265310bac3fe854f4a7d8aa897ea8e82e7c2ab8`. | Login uses publishable-key GoTrue password authentication, not generateLink/getUserById as password authentication. A random 12-hour opaque handle is stored hashed; requests recheck revocation, expiry, verified/non-banned Auth identity and patient binding. Portal uses HttpOnly/Secure/SameSite-lax host cookie and server-only no-store requests with redirect rejection. Source trace only: deployed Portal mode and live patient login were not exercised. |
| Tenant/company escalation: NOT REPRODUCED | `resolveSalesIdentity()`/`resolveSalesActor()` in `src/server/sales-native/auth.ts`; Meta `requireMetaCompany()`; SQL `native_meta_require_company`, `native_meta_onboarding_actor`, `native_meta_manage_company`. | Actor derives from verified Auth, active matching usuarios/membership, explicit requested organization and active organization. Meta independently checks company assignment and SQL authority. Patient endpoints derive contact/org from stored identity, not caller IDs. Existing real PostgREST/company tests and patient/Sales unit denials are retained. This is not an exhaustive certification of every pre-existing Sales RPC. |
| Planner/shared-schema conflict: NOT REPRODUCED | Meta migrations `20261031190000`, `20261119000000`, their prechecks/checks/rollback; Planner history labels `20261110060000_planner`, `20261110075000_planner_workbook_navigation`. | Reuse prior reconciled Planner metadata and exact unchanged Meta DDL evidence. Meta does not create or alter Planner objects, auth.users, patient/payment or medical tables. Shared schema/version-ledger divergence remains an operational concern; no ledger repair, schema mutation or inference of identical migration bodies from names is made. Full fresh chain runs through existing CI; previously passed checks are not a substitute for a target-specific precheck. |

## Verification and changes

- New shared-consumer tests: 34 cases, real factory/guards/consumer code with mocked
  SDK and session transport; no network or real provider calls. They are not live RLS tests.
- Focused run: 97/97 PASS across shared factory consumers/isolation, Sales actor and
  Patient API tests. TypeScript and focused ESLint PASS.
- Five new real PostgREST cases in the existing approved disposable CI fixture.
  Their actual run results and final-head full checks are recorded on PR #209 after CI.
- No production-code defect was reproduced from the available claims, so no
  speculative application/security-policy patch or separate remediation PR is created.
  No application behavior, migration, workflow, credential, provider setting or hard
  prohibition changed. AGENTS now records the existing identity/privilege boundary.
- Rollback of this supplement is a normal reviewed revert of its tests/documentation;
  no database down migration or data recovery is required. Existing Meta migration
  rollback prerequisites remain unchanged, including populated-history refusal.

## Exact questions remaining for Wagner

1. Which branch/commit contains `docs/operations/pr-209-review.md`? Provide the file
   or commit/diff containing all 12 findings so each can be mapped to its reproduction.
2. For the shared-factory regression, which route, hosting environment and baseline
   versus #209 SHA failed? Supply the error code/stack and only masked metadata:
   VERCEL_ENV, app tier, local/Production/isolated-QA target classification, presence
   of credential aliases and approval ID. Do not supply key/token values.
3. For the five-table concern, which caller/role, HTTP endpoint or RPC and request
   can read another patient's/payment record? Is the claim about browser access,
   a specific service query missing scope, or the broader BYPASSRLS architecture?
   Use synthetic IDs and a local reproduction, not Production patient data.
4. What server-side corporate-domain restriction is planned (GoTrue signup/login,
   staff onboarding, or a specific hook)? Which patient signup/login/reset behavior
   must remain supported? This determines the separate shared-Auth compatibility plan.
