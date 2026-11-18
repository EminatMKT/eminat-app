# Meta connection management — Phase 1

## Baseline and scope

Started from current `EminatMKT/eminat-app` main, `ece3e9b328808f61a8981cce948b9a55c55e0476`, verified October 31, 2026. The audit's single-Page handoff, aggregate encrypted discovery blob, company-model gap, missing callback workspace context and locally-only revocation remain in that source. PR #198 is not incorporated. No EMC-specific identifiers or ANNIE runtime dependency are introduced.

Sales Settings → Integrations → Meta opens `/sales-native/integrations/meta`. That dedicated surface lists the caller's exact active Sales memberships, including organizations outside the commercial workspace allowlist. It does not change which commercial workspaces other Sales pages expose. An organization must be explicitly selected; there is no first-tenant fallback. Company selection is explicit before authorization and frozen in server state through asset selection. A changed company query parameter cannot change the handoff's assignment.

Supported discovery is Facebook Pages and, when explicitly requested, their permitted linked professional Instagram accounts. Standalone Instagram/Unified Login and WhatsApp onboarding are not implemented by this phase. The existing Meta app is supplied through existing server bindings; no app, credential, subscription or hosting resource is created.

## Authorization and ownership contracts

Every operation requires the existing `sales:social:manage` capability, an active exact LILLY Auth/profile/Sales membership, an active organization, a reviewed `sales_social_company_bindings` row, an active operational company, and the user's explicit existing `usuario_empresas_acceso` assignment. Global corporate admin status does not bypass the explicit company assignment. SQL enforces the same existing Administrator/Superadmin capability roles. No names, company codes or emails are matched to establish a relationship.

The migration seeds **zero company mappings**. Approved mappings need exact organization UUID, operational company key, approving LILLY user UUID and evidence reference through a separately reviewed operator procedure. They do not grant company access or Sales membership. Missing mappings remain a visible blocker rather than being inferred.

Identity remains separate at each boundary:

- `sales_members`: authorizing LILLY member, with its existing Auth/profile binding.
- `sales_social_grants`: Meta principal ID, Meta app, authorizing member, scoped company, recorded permissions, expiry and separately encrypted user grant.
- `sales_social_integrations`: tenant/company connection and its current grant; no copied plaintext or duplicate user token.
- `sales_social_accounts`: connection grouping, explicitly typed `connection`; not represented as a Meta business owner.
- `sales_social_assets`: selected Page/Instagram asset, company, generation and Meta-reported business ID. Missing business information stays unknown.
- `relationship`: explicit company-owner assertion or agency-delegated access declaration. Neither transfers nor independently verifies ownership. Official authorization establishes permitted access, not LILLY ownership inference.

Composite foreign keys protect company→grant→connection→account→asset and asset ownership reservation. One external asset is reserved to one organization/company. A fresh connection cannot steal an existing reservation. Reconnect is an explicit target integration in the same tenant/company; another currently eligible authorizer may replace its grant. Omitted assets are locally disabled and remain reserved. No automatic transfer/release endpoint exists in Phase 1.

## OAuth, storage and health

The 32-byte state is hashed in storage with a versioned deployment domain: environment, exact approved callback and configuration context. The raw state alone cannot find a handoff in another deployment, even if its row was copied. Lookup, atomic exchange claim, candidate selection and completion all use this domain; the exchange rechecks it before persisting discovery. Changing the approval or credential set invalidates outstanding handoffs; restart authorization rather than migrate them. It binds requester, organization, company, app, return context and optional reconnect target. A ten-minute handoff is atomically claimed before exchanging a provider code; a replay cannot exchange again. Completion locks and consumes the handoff transactionally. Denial and successful callbacks preserve the authorized workspace. Redirects use a fixed local path, URL-encoded context, no-store and no-referrer. Tokens and authorization codes are never returned to the UI or logged.

Discovery stores each candidate's token separately under the existing AES-GCM vault, bound to organization plus candidate UUID. The former 16 KiB aggregate blob is unused. Bounds remain: 10 Graph pages of 100 results, at most 2,000 Page/linked-Instagram candidates, 4 MiB per Graph response, 100 selected assets, 16 KiB inbound selection body and the unchanged per-token vault limit. Selected tokens are rewrapped to their final grant/integration contexts. Completion/expiry removes discovery credentials.

Recorded validity is distinct from provider validation. `checked_at` is absent until a health check. The health action reads `me/permissions` with a bearer header: invalid-session/token codes become revoked access, missing discovery permission requires reconnect, and throttling/transport/provider failure remains an unknown provider outcome rather than a revocation. Old health results cannot change a newly replaced grant. Successful permission checks rediscover permitted assets and require reconnection if a selected asset is no longer available. Neither a permission check nor discovery certifies business ownership or every future write task.

Lifecycle states include active, expired, revoked, ineligible/departed authorizer and local disablement. Fixed-rule housekeeping rechecks membership/profile/company eligibility and expiry, removes unusable local credentials and marks required reconnection. It runs before connection/status operations and through the existing daily recovery endpoint as an expiry backstop. No indefinite token renewal is assumed: reconnect performs official authorization again.

## Disconnect and ingestion fences

Disconnect is local only: clear grant/asset credentials, disable local accounts/assets, rotate generations, cancel pending reconnects, retain source history and ownership reservations. `provider_cleanup` independently tracks not-requested, pending, failed or confirmed. The code does not manufacture confirmation. `prepareMetaDisconnect` prepares review-only unsubscribe identifiers and flags shared-app-principal revocation for manual review. There is no live cleanup executor or browser-accessible confirmation endpoint. A later operator operation must establish evidence before confirmation; local tokens have already been destroyed, so provider-side cleanup may require the business administrator's official Meta UI or separately authorized existing access.

Ingestion is unconditionally disabled at three boundaries:

1. The signed webhook rejects deliveries without persistence.
2. The recovery worker never claims or fetches leads.
3. SQL receive/retry RPCs reject; the claim RPC yields no jobs. Legacy complete/refresh/subscribe/revoke RPCs are no longer executable by `service_role`.

The provider enable switch does not override these fences. Assets are never subscribed by this flow. The SQL rehearsal simulates a future administrative external-ID reassignment plus an older tenant's queued receipt: neither retry nor new delivery can enter the new tenant. New generation stamps prepare future routing, but future ingestion must be separately reviewed and must never restore external-ID-only retry routing.

## Migration and rollback

Prepared migration: `20261031190000_meta_connection_management.sql`. It changes Social structures/functions only and refuses any pre-existing Meta integrations; it will not reinterpret legacy or PR #198 connections. No Production migration is applied. No providers or organizations are enabled.

`python3 scripts/qa/meta-connection-isolated.py` starts a fresh PostgreSQL 17 UNIX-socket-only cluster, uses the actual Native Sales/Social migrations plus synthetic Auth/company prerequisites, applies this migration, runs tenant/company/OAuth/lifecycle/ingestion checks, performs a clean-schema down migration, compares original RPC definition/ACL fingerprints and reapplies. It uses no existing database connection or credentials. Set `META_TEST_PG_BIN` if PostgreSQL binaries are elsewhere. The normal CI migration-chain/Social rehearsal additionally runs against the complete local Supabase schema.

`scripts/migration/rollback_meta_connection_management.sql` is a guarded **unused-schema** down migration. It refuses any Phase 1 connections, mappings, grants or handoffs, and refuses an enabled provider. It restores original Social RPC definitions/ACL only under that empty/inactive condition. If Phase 1 has data, preserve tables/history/reservations and ingestion fences; disable OAuth activation and use a separately reviewed application/credential retention rollback. Never drop acquired data or restore the old ingestion receiver on a populated installation.

## Validation and exact controlled QA plan

Completed locally: TypeScript; lint (existing unrelated warnings only); CSS lint; dropped-column guard; complete unit suite; English desktop/Spanish mobile browser fixture; isolated PostgreSQL apply/integration/down/reapply checks. Provider calls in tests are mocked. Browser tests use a loopback synthetic identity source and mocked Social endpoints, and forbid navigation to live Meta. Full-chain CI status belongs to the exact PR commit, not this baseline statement.

Reproduction commands:

- `pnpm test`
- `pnpm typecheck && pnpm lint && pnpm lint:css`
- `pnpm exec playwright test --config=playwright.meta.config.ts`
- `python3 scripts/qa/meta-connection-isolated.py`
- Full Supabase CI runs `supabase/checks/native-sales-social-rehearsal.sql`, which selects the Phase 1 rehearsal on this schema.

Before any future live QA, separately approve the exact PR commit, fresh backup, migration digest and reviewed company mappings; require green full-chain CI and protected isolated Preview. No Production or Meta action is authorized by this document alone.

Controlled QA after that approval:

1. Use two synthetic organizations, three companies, two eligible authorizers and one ineligible role. Verify absent membership, absent company access, absent binding, disabled company and forged organization all deny without provider calls.
2. Exercise approved and denied consent with the existing app. Verify same requester/company/workspace, foreign/expired/replayed state rejection, and no code/token in UI responses or logs. This live authorization step requires separate authorization and existing permitted test assets.
3. Select several Pages and permitted linked Instagram assets; leave others unselected. Verify exact company assignment, reported-owner unknown handling, declared agency relationship and duplicate reservations. Test changed company URL during selection: stored company remains authoritative.
4. Reconnect the same integration using another eligible authorizer; verify old grant invalidation, omitted asset disablement and stale health-result rejection. Revoke original employee access and verify local credentials become unusable. Test expiry and provider invalid-token, permission-denial, rate-limit and outage results with mocks first.
5. Locally disconnect and verify no local credentials, no apparent confirmed provider cleanup, no release of reservation, and no provider DELETE/POST. Pending/failed cleanup remains visible. Do not execute provider cleanup during this phase's QA.
6. Even with synthetic provider/asset flags forced active, verify signed lead/message/comment deliveries, direct receive/retry RPCs and scheduled recovery perform zero ingestion. Check counts, not real customer contents.
7. Recheck existing Sales navigation and English/Spanish desktop/mobile views. Confirm no change to QBO, Meetings, Tasks, commercial records, pipelines or ANNIE runtime.

## External blockers retained

The October 31 audit last observed the existing Meta app in Development, business unverified, relevant Standard Access without demonstrated review, ANNIE callback/domain/legal URLs, and missing Page/Instagram webhook callbacks. This implementation does not alter or reverify live Meta settings. Reuse must be confirmed against the required discovery permissions and current app eligibility. LILLY callback/domain/legal configuration, applicable Advanced Access/App Review/business verification for unrelated customers, approved tenant-company mappings and existing server secret bindings remain separate release prerequisites. No new app, secret or credential should be created by default. No webhooks/subscriptions are needed to validate connection management.


## November 1 isolated-QA safeguards and operator prerequisites

PR #203 remains draft. No deployment, remote migration, environment edit, Meta authorization, provider operation, new credential, company access or mapping is authorized or performed by this update. The original SQL migration and rollback are unchanged; deployment binding uses the existing 64-character `state_hash`, so no new migration is needed. Pre-v2 pending handoffs become unusable and expire normally.

### Callback and environment contract

`meta-qa-isolation.cjs` is the shared server/build policy. Production requires Vercel's `production` environment, `NEXT_PUBLIC_APP_ENV=production` and the exact Production database URL. Its sole callback remains `https://app.stratixsolutions.us/api/sales-native/social/meta/callback`.

Real QA is supported only in Vercel `preview`, using one unexpired record in the review-owned `docs/operations/meta-qa-approvals.json`. **That file is deliberately empty. There is no approved real QA deployment or database.** A binding alone cannot add an approval. No `development`, custom environment, wildcard hostname, incoming Host/forwarded-host, redirect query, or arbitrary callback binding can select a callback. `LILLY_META_REDIRECT_URI` and `LILLY_META_CALLBACK_URL` are rejected. Connect and callback requests must use the approved origin; a supplied Origin header must agree. Success, denial and authentication-error redirects use that origin, never the request origin or Production fallback. An unapproved callback request fails without a redirect or provider call.

The exact QA callback will be `<reviewed HTTPS origin>/api/sales-native/social/meta/callback`. Its hostname/URL is **not yet known or approved**. Do not register a guessed URL. The Graph adapter independently validates its callback against the same policy before exchanging a code. OAuth state is deployment-bound through its hash domain; SQL's requester/company/expiry/single-claim checks remain unchanged. The approval context pins database and credential provenance in addition to callback and environment.

Synthetic unit tests use the fixed `synthetic-app` / synthetic secret and localhost callback only under `NODE_ENV=test` without a Vercel environment. Browser fixtures retain loopback Supabase and dummy keys, with Social/provider endpoints mocked. These fixtures are not eligible for live Meta authorization.

### Required existing bindings (presence and scope only)

Before a separately approved QA deployment, the operator must verify these **existing** bindings, without exposing their values in logs, PRs, UI or reports:

| Binding | Required QA scope and check |
| --- | --- |
| `LILLY_ISOLATED_QA_APPROVAL_ID` | Preview only; exactly one reviewed, unexpired allowlist record. Currently missing by design. |
| `VERCEL_ENV`, `VERCEL_TARGET_ENV` when set | System scope; must be `preview`. Never relabel Preview as Production. |
| `VERCEL_PROJECT_ID`, `VERCEL_ORG_ID`, `VERCEL_GIT_COMMIT_REF` | Must match the approved existing hosting project, team and exact branch. Check availability at build **and** runtime. |
| `NEXT_PUBLIC_APP_ENV` | `local` for QA. This public tier never authorizes database access. |
| `NEXT_PUBLIC_SUPABASE_URL` | Exact canonical HTTPS URL of the approved isolated project; no custom domain, credentials, port, query or alternate path. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Existing key for that isolated project; only this public client key may enter the browser. SHA-256 must match the reviewed record. |
| `SUPABASE_SECRET_KEY` | Existing isolated project's server key; exact reviewed SHA-256. This is the name used by `supabaseAdmin`. |
| `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Prefer absent. If retained, each must independently match an approved fingerprint and project/role checks. They do not replace the two required names above. |
| `LILLY_META_APP_ID`, `LILLY_META_APP_SECRET`, `LILLY_META_GRAPH_VERSION` | Existing Meta app, approved ID/version and server-secret fingerprint; no new app or credentials. |
| `LILLY_SOCIAL_TOKEN_KEY` | Existing **separate QA** 32-byte base64url key; reviewed SHA-256 of the decoded 32 key bytes must differ from the verified current Production key fingerprint. Missing separate key blocks QA; never copy Production's key. |
| `LILLY_META_OAUTH_ENABLED` | Keep disabled until separate authorization for controlled live QA; connection operations require `true`. |
| `LILLY_NATIVE_SALES_ENABLED`, `LILLY_NATIVE_SALES_PRIMARY` | Existing native Sales gates; verify intended QA scope. |

`LILLY_META_VERIFY_TOKEN` is not required for connection-only QA. `CRON_SECRET`, mail, accounting, database connection strings and other privileged worker bindings remain prohibited in Preview; the database exception does not relax those guards. Recovery/cron and webhook subscription configuration are unnecessary for this QA. Ingestion remains fenced at HTTP, worker and SQL boundaries.

### Review-owned approval record and isolation evidence

A future separately reviewed record must contain: `id`, `environment` (`preview` only), `evidence`, `expiresAt` (UTC), `vercelProjectId`, `vercelOrgId`, `branch`, exact HTTPS `origin`, `forbiddenProductionOrigins` (include `https://app.stratixsolutions.us`, `https://hub.eminat.net` and every current Production alias), `supabaseProjectRef`, `databaseKeySha256` keyed by each configured database binding name, `vaultKeySha256`, `productionVaultKeySha256`, `metaAppId`, `metaAppSecretSha256` and `graphVersion`. Store only SHA-256 fingerprints, never raw credentials. Database and Meta app secret fingerprints hash the exact binding strings. Both vault fingerprints hash the decoded 32 key bytes, so alternate encodings cannot disguise reuse; the QA binding must use canonical unpadded base64url. The approval is server-side; do not expose it through an API or import it into client components.

The reviewer must establish that the isolated database is a distinct existing non-Production project, has no Production restore/customer data, has separate Auth users and credentials, and has no production replication/import path. Evidence must also identify all Production aliases and verify the current Production vault fingerprint through an authorized secret-audit procedure. The policy cannot determine the destination of an opaque key offline: the reviewed fingerprint is the provenance attestation for the exact URL/key pair. For legacy JWT keys it additionally rejects a mismatched `ref`, wrong `anon`/`service_role` role or expired token. Fingerprinting is not a substitute for independently establishing project ownership and isolation.

At build and before each server database client is created, reject the Production project `ruedelunbtaomhrzgelc`, any other/unapproved URL, mismatched or additional credential, expired approval, wrong hosting team/project/branch/environment, missing vault provenance or Production vault reuse. Runtime checks use the actual parsed database URL/server key and public build key. A skipped build check cannot enable the server database client. Guard errors contain fixed codes only. These checks do not certify database contents: the separate evidence above is mandatory.

### Controlled sequence after blockers are resolved

1. Review the exact code/approval record and retain draft status. Identify an existing protected Preview origin and isolated database; if either or any required credential does not exist, stop. Do not create infrastructure or credentials as part of this phase.
2. Independently verify isolation/provenance, current public customer onboarding versus app-role restrictions, and exact authorizer/company access. Obtain separate authorization before adding a real approval record, changing configuration, deploying, applying even an isolated migration, or starting Meta consent. None is performed by this PR update.
3. On the separately approved isolated target, rehearse the unchanged full migration chain with synthetic identities only, the guarded empty rollback and reapply. Do not restore Production data. Require the exact resulting head's CI and deployment evidence, not PR #198 or an older Preview.
4. Run synthetic authorization denials, state replay/expiry/environment mismatch, multiple companies/assets, duplicate ownership, lifecycle/health failures, local disconnect and delayed-event isolation. Inspect only sanitized responses/logs; assert zero ingestion and provider writes. The existing app-role live QA sequence above remains separately gated.
5. Only after explicit live-QA authorization, register the reviewed QA callback on the existing app and verify its effective settings. Authorize only approved app-role people/assets. No subscription, ingestion, publication or provider cleanup. Public customer onboarding still requires its own applicable Meta verification/review/live-mode gates.

November 1 preflight blockers remain: ANNIE callback/domain/legal settings, no exact-commit Preview, no approved isolated project/credential evidence or separate QA vault key, no company access assignments/reviewed mappings, and no second verified eligible authorizer. The linked EMC Instagram account's access request is pending. Do not infer these have been resolved by code tests. **Ready for real isolated QA: NO.**


Validation of the November 1 code update: 123 targeted isolation/Social/OAuth/webhook/worker tests pass; English desktop and Spanish mobile synthetic Meta browser tests pass (2/2); TypeScript, changed-file lint and a local optimized build with dummy database bindings pass (existing unrelated lint warnings only). No live provider or remote database was used. SQL files were unchanged; the prior isolated migration/rollback results remain baseline evidence. Exact new-head CI status must be checked separately after push.
