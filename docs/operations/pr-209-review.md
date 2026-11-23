# PR #209 review — Meta connections (Native Sales / "LILLY")

**PR:** [EminatMKT/eminat-app#209](https://github.com/EminatMKT/eminat-app/pull/209)
**Branch:** `feat/meta-connections-recovery-phase1` → `main`
**Head reviewed:** `fca28961d2362b0f73c6f957f7542647cb7df7cc`
**Base:** `4fcd1c82a96a8d080c83730da4fe374323800cb1`
**Requested by:** Freddy, 2026-11-19
**Status at review time:** CI green (6 checks incl. 4 e2e shards); not yet approved/merged.
**Reviewer note:** the PR description contains extensive self-reported "all tests PASS" /
"production reconciled" language. That language was treated as the author's claim, not as
evidence — the findings below come only from reading the actual diff and the checked-out
worktree (`.worktrees/pr-209-review`, left in place for follow-up; remove with
`git worktree remove .worktrees/pr-209-review && git branch -D pr-209-review` once no longer
needed).

> **2026-11-23 update:** all 10 code findings below have been fixed, committed in this
> worktree's branch (`pr-209-review`, commits `4e612a0c`..`4e142a8e`, listed per finding), and
> NOT pushed, merged, or applied to prod. See each finding's **Resolution** note and the new
> "Status after fixes" section at the end. This review doc itself was not part of the PR branch
> — it only existed on `main` (committed separately, 2026-11-20) — so it's reproduced here with
> resolutions so it travels with the fixes.

## Credentials — do we need anything new from Freddy?

**No.** Diffing every `process.env.*` reference between `main` and the PR head shows **zero new
env var names** introduced by this PR. It reuses the Meta credentials already configured:
`LILLY_META_APP_ID`, `LILLY_META_APP_SECRET`, `LILLY_META_GRAPH_VERSION`,
`LILLY_META_OAUTH_ENABLED`, `LILLY_SOCIAL_TOKEN_KEY` (vault key) — all pre-existing. The PR's own
doc (`docs/operations/meta-connections-phase1.md:120`) states this explicitly: "Existing Meta
app, approved ID/version and server-secret fingerprint; no new app or credentials."

Two things worth knowing, not credential requests:
- `LILLY_META_OAUTH_ENABLED` ships **disabled** (`false`) in this PR and must stay that way until
  a separate, later authorization turns real OAuth on — merging this PR does not itself activate
  anything.
- The webhook route (`LILLY_META_VERIFY_TOKEN`) is explicitly disabled by this PR too
  (`META_INGESTION_DISABLED`), not wired up — no token rotation needed for that path.
- The PR's own readiness note is blunt about this: **"Ready for real isolated QA: NO"** — pending
  items include a separate QA vault key, an approved isolated project, company-access mappings,
  a second eligible authorizer, and a pending EMC Instagram access request. None of that is a
  credential Freddy needs to hand over now; it's follow-up work the PR itself defers.

## Findings from `/code-review high pr 209` (8 parallel review angles + 4-way verification;
all candidates sent to verification came back CONFIRMED)

1. **`src/shared/db/supabaseAdmin.ts:9`** — the shared `service_role` client factory (used by
   Admin, Billing, Directory, QuickBooks and many unrelated routes) now runs
   `assertDeploymentIsolation()`, which falls into a Meta-specific QA-approval fingerprint gate
   whenever `VERCEL_ENV` is `preview`/`development`. A Preview deployment with real credentials
   calling any unrelated route can now throw `NON_PRODUCTION_CREDENTIAL_ISOLATION_REQUIRED` for
   features that have nothing to do with Meta. This is the one that most directly conflicts with
   AGENTS.md's "a shared piece doesn't get worse for existing consumers" rule.

   **Resolution (`4e612a0c`):** `supabaseAdmin()` no longer passes `assertDeploymentIsolation()`
   the full `process.env`. It now passes only what the Supabase client itself and an explicit
   `LILLY_ISOLATED_QA_APPROVAL_ID` record actually need to validate; the Meta-specific keys
   (`LILLY_META_APP_ID`/`APP_SECRET`/`GRAPH_VERSION`/`LILLY_SOCIAL_TOKEN_KEY`) are only included
   when an approval id is actually present. Unrelated secrets (QBO, patient email, cron,
   `DATABASE_URL`, `RESEND_API_KEY`) can no longer make Admin/Billing/Directory/Tasks refuse to
   construct a client. A new regression test in `supabaseAdmin.consumers.test.ts` covers exactly
   this. The Meta OAuth flow's own isolation (`metaDeployment()`/`resolveMetaDeployment()`) is
   completely separate and unaffected.
   **Known, separate, pre-existing gap — out of scope here:** `next.config.js:3` calls
   `assertDeploymentIsolation(process.env)` unscoped, at build time, and predates this PR entirely
   (zero diff vs. `main`). A real Preview build with real unrelated secrets would still fail at
   `next build`, independent of this fix. Left untouched — it's a separate architectural decision
   (build-time vs. runtime isolation strategy) for Wagner, not something to fold silently into
   this PR's findings.

2. **`src/server/sales-native/social/connection-policy.ts:11`** — `metaReturnPath()`
   unconditionally returns the legacy `/sales-native/integrations/meta` path, so OAuth
   completions started from the new central `/settings/integrations/meta` never return there.
   Breaks the PR's own "central/universal" premise for that entry point.

   **Resolution (`82e0429d`):** `beginMetaConnection` now derives the entry point from the
   request's Referer header (`resolveMetaEntryPath()`), validated against a 2-item allowlist
   (never trusted verbatim), and stores it in the existing `return_path` column. Completion reads
   it back and `metaReturnPath()` builds the redirect from it instead of a hardcoded path.
   **A regression was introduced and caught in the same pass:** the OAuth callback route's own
   `back()` function still validated the final URL against a single hardcoded legacy path, so
   every outcome of a Settings-started flow (consent denied, provider error, or success — after
   the grant was already saved) returned a blank HTTP 400 instead of redirecting back. An
   adversarial review (a Fable-model subagent) caught this; fixed in the same commit by validating
   against the same allowlist `metaReturnPath()` uses, with a new `route.test.ts` case covering
   the exact scenario so it can't silently regress again.

3. **`src/server/sales-native/social/meta-connection.ts:48`** — `beginMetaConnection` and
   `connections/route.ts`'s `metaAvailable` stopped checking `sales_social_providers.enabled`;
   availability is now derived purely from env vars, so the DB kill-switch no longer stops new
   connections during an incident.

   **Resolution (`82e0429d`, `5ef8c717`):** both `beginMetaConnection` and the new
   `listMetaConnections()` (see finding 10) now query `sales_social_providers.enabled` and factor
   it in. Covered by a new test in `meta-connection.test.ts`. Operational note: the seed value for
   this flag is `enabled=false`, and nothing in this PR flips it — after merge, Meta stays
   unavailable until a separately reviewed migration/operation turns it on. The kill-switch is
   still only checked at `begin`, not at `exchange`/`complete`, matching exactly what this finding
   named — a connection already mid-flow when the switch flips can still finish; out of scope here
   since the original finding didn't ask for that.

4. **`src/features/native-sales/MetaCompanyOnboarding.tsx:53`** — the "disable company" action
   still sends the stale `relationship` value instead of `null`, contradicting the backend's own
   test contract and corrupting the append-only `sales_social_company_binding_events` audit trail.

   **Resolution (`0a42f918`):** fixed — sends `null`.

5. **`src/server/sales-native/social/meta-connection.ts:121`** — `exchangeMetaConnection`'s bare
   `catch` discards the specific failure code (e.g. `META_PERMISSION_UNAVAILABLE`) and always
   rethrows the generic `META_AUTHORIZATION_FAILED`; ops can no longer tell "user declined a
   scope" from "Meta API was down."

   **Resolution (`82e0429d`, `661d1627`):** `exchangeMetaConnection`'s catch now rethrows
   `META_PERMISSION_UNAVAILABLE` specifically; everything else still collapses to the generic
   code on purpose. **The first pass of this fix had no observable effect end to end**, caught by
   the same adversarial review: the only real caller, the OAuth callback route, had its own bare
   `catch` that swallowed the distinction back into one generic code, and the client never read
   the actual `metaError` query value at all (it hardcoded a fixed message regardless of what the
   server sent). Both are now fixed — the callback route propagates the specific reason into the
   redirect, and the client reads it and shows a new, distinct `meta.permissionDeclined` message.
   New test coverage in both `callback/route.test.ts` and `NativeSocialStatus.test.tsx`.

6. **`src/features/native-sales/NativeSocialStatus.tsx:1`** — the role gate that hid the
   connection-management UI from non-SUPERADMIN/ADMINISTRATOR members was dropped in this PR's
   rewrite. Mitigated server-side (`canManageMeta()` still 403s), but the defense-in-depth margin
   for any future endpoint on this panel is thinner.

   **Resolution (`661d1627`):** **the first pass of this fix was incomplete**, caught by
   adversarial review — it only gated `MetaCompanyOnboarding`'s rendering on `snapshot.canManage`,
   which can never actually be `false` in a successful response, since the server throws 403
   before returning anything. Redone properly: `NativeSocialStatus` now takes an optional `role`
   prop and, when it's supplied and doesn't qualify, skips the privileged `/connections` fetch
   entirely and renders a minimal notice instead — restoring exactly the behavior `main` had
   before this PR's rewrite. `role` is threaded only from `NativeSalesModule.tsx`'s own "social"
   tab, the one call site that isn't already filtered to admin-only org memberships server-side
   (via `metaAdministrationOrganizations`, used by the Settings/Sales-native integrations pages).
   Those two call sites keep today's fetch-then-403 behavior on purpose. New test coverage in
   `NativeSocialStatus.test.tsx`.

7. **`src/server/sales-native/social/meta-connection.ts:95`** — two `hash(state) !== stateHash`
   checks are tautological dead code (`state` is never reassigned), giving false confidence that
   a replay/tamper re-check exists.

   **Resolution — this finding was wrong, not the code.** A first pass removed both checks as
   "dead code"; running the existing test suite immediately surfaced 4 failures proving otherwise.
   `hash()` is not a pure function of `state` alone — it also calls `metaDeployment()`, which
   re-resolves *live* deployment context (`resolveMetaDeployment(process.env)`) each time it
   runs. Repeating the check after the atomic DB claim, and again right before persisting the
   exchange result, catches the deployment context drifting mid-request (e.g. a credential
   rotation happening between those two points) — a genuine, intentional consistency check, not a
   tautology. `meta-connection.test.ts` already had two tests exercising exactly this
   (`"rejects a deployment change during the atomic claim..."` and `"revalidates deployment
   context before persisting provider results"`). Both checks were restored verbatim, with a
   comment explaining why, in `82e0429d`.

8. **`supabase/migrations/20261031190000_meta_connection_management.sql:89`** — the "active org
   admin with active company binding" predicate is reimplemented four times with small variations
   instead of one shared predicate function; a future rule change risks being applied in one copy
   and missed in another.

   **Resolution (`4e142a8e`):** the original migration is already committed elsewhere in this
   PR's own history and can't be rewritten in place (this repo's own guard refuses that — a
   committed migration never gets edited, a fix goes in a new migration). Shipped as a new
   migration, `20261123173742_meta_connection_shared_company_admin_predicate.sql`, with a matching
   precheck/rollback/check, extracting `native_meta_active_company_admin()` as a `STABLE` shared
   predicate and using it from `native_meta_require_company` and both inline sites inside
   `native_meta_expire_access` (3 of the 4 named copies). No GRANT is widened. Verified locally,
   end to end, against `127.0.0.1:54322`: applies, its own check passes, its rollback reverts to
   the exact original inline bodies, re-applying is clean, and `20261031190000`'s own existing
   check still passes unaffected throughout. The fourth copy,
   `native_meta_onboarding_actor` (in `20261119000000`), was left alone — no company argument,
   uses `FOR SHARE`, different enough shape that folding it in wasn't a clean fit.

9. **`src/features/native-sales/useMetaWorkspaces.ts:12`** — a third/fourth hand-rolled copy of
   the session+Authorization-header+org-header fetch wrapper, already diverging (missing
   `If-Match`/`Idempotency-Key`/audit logging that the original helper has) instead of extending
   the existing `apiSend`/`NativeRequest` helpers.

   **Resolution (`9dea5d13`):** **a first pass only added audit logging to the existing
   duplicate, without removing the duplication** — caught by adversarial review as not actually
   addressing the finding. Redone: a new shared `src/features/native-sales/session-fetch.ts`
   converges 3 of the 4 duplicated copies (`useMetaWorkspaces.ts`, `MetaConnectionsWorkspace.tsx`,
   `MetaConnectedAccounts.tsx`); each caller's own catch block was checked before converging to
   confirm no observable error-message change. `NativeSalesModule.tsx`'s own copy — the 4th, and
   the one the finding pointed at as "the original helper" — was deliberately left as its own
   implementation: it owns `If-Match`/`Idempotency-Key` and a different response/error contract
   its own callers depend on, and converging it was judged a worse risk/benefit trade than the
   duplication it would remove.

10. **`src/app/api/sales-native/social/connections/route.ts:8`** — violates AGENTS.md's
    "`route.ts` solo exporta handlers HTTP" by inlining ~40 lines of query/ACL/reshaping logic,
    unlike the sibling `companies/route.ts` added in the same PR, which correctly delegates to a
    `src/server/` module.

    **Resolution (`5ef8c717`):** the logic now lives in a new `listMetaConnections()` in
    `meta-connection.ts`, matching the sibling pattern. `metaAvailable` and `canManage` are
    computed for real there (see findings 3 and 6) instead of being hardcoded.

## Additional findings (Sales/LILLY module in general, not specific to PR #209 — found 2026-11-20
while investigating why local testing couldn't reach the Sales module; bundling here so they get
fixed in the same pass as the 10 findings above)

11. **RLS enabled, zero policies, on the tables holding money and patient identity.**
    `sales_patient_identities`, `sales_payments`, `sales_qbo_connections`,
    `sales_qbo_invoice_jobs`, `sales_qbo_oauth_states` all have Row Level Security turned on
    but **no policies defined** (confirmed against `pg_policy`: 0 rows for all five). With RLS on
    and no policy, Postgres itself grants nothing — the only thing stopping any bug anywhere in
    the app from reading a payment record, a QuickBooks OAuth token, or a patient's identity is
    whichever API route happens to touch it being bug-free. Compare to `/medical`'s `pacientes`
    table, which has a real enforced policy (`USING (has_module('medical'))`). These five don't.
    This is independent of PR #209 and should be fixed regardless of what happens with it.

    **Not part of this round.** Separate architecture track with Freddy (RLS gap + shared-Auth
    identity question); untouched by the fixes documented above.

12. **Two authentication populations share one Auth tenant, and only one of them is gated.**
    Patients/external customers are provisioned as real `auth.users` rows via
    `admin.auth.admin.generateLink()` / `getUserById()` (`src/app/api/patient/v1/[resource]/route.ts:69,344,415`),
    with no corporate-domain check anywhere server-side. The "only @eminat.net/@emc.health/
    @vivinegretefoundation.org" rule is enforced only client-side, in the submit handler of
    `src/app/login/page.tsx` (via `DOMINIOS_VALIDOS`) — a page this provisioning path never goes
    through. Concretely: the assumption "every authenticated user is an Eminat employee," which
    the rest of the app's role/permission system is built on, is not true at the data layer.
    Employee accounts and external patient/customer accounts coexisting unseparated in the same
    `auth.users` means a bug in the employee-side authorization logic could, in principle, be
    reachable by an external patient session, and vice versa — two trust boundaries with no
    structural wall between them, only the correctness of whichever code path happens to run.

    **Not part of this round.** Same separate architecture track as finding 11.

## Status after fixes (2026-11-23)

All 10 code findings above are fixed and committed in this worktree's branch (`pr-209-review`),
commits `4e612a0c` through `4e142a8e` (7 commits total, listed per finding above). Full test
suite green: `npx -y pnpm@10 tsc --noEmit -p .` exits 0, `npx -y pnpm@10 vitest run` passes
**768 files / 3376 tests**, all verified directly (not taken on faith) before writing this note.
`eslint` clean on every file touched.

This round was independently adversarially reviewed once already, mid-session, by a Fable-model
subagent given the exact same adversarial brief a fresh reviewer would get. It caught a real
regression (finding 2's callback-route 400, described above) and three incompletely-addressed
findings (2's follow-on, 5, 6, 9) — all fixed in the same pass, documented above rather than
hidden. **This is not a signal to merge.** The decision to approve/merge this PR, and how it
reconciles with findings 11/12's separate architecture question, stays Wagner's, per AGENTS.md's
production-change contract. Nothing from this round has been pushed, applied to prod, or had any
GitHub action taken on it.

## Recommendation (as of the original 2026-11-20 review — see "Status after fixes" above for what changed)

Do not approve as-is. Item 1 is the one that actually risks breaking unrelated, already-shipped
features outside the Meta scope. Items 2 and 3 contradict claims made in the PR body itself
("compatibility retained", working central navigation). The rest are real but lower-severity
(audit-trail correctness, error-code fidelity, duplicated logic, convention drift).

No GitHub action (approve/request changes/merge) has been taken on the PR from this review —
that decision stays with whoever reviews it on GitHub, per AGENTS.md's production-change
contract.
