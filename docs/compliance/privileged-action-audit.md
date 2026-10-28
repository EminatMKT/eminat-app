# Privileged-action traceability
Reviewed actual Production metadata and current source 2026-10-28. Overall **PARTIAL**. No real patient, payment or audit-event rows were displayed. The new append-only metadata store is a tested proposal pending protected schema approval and exact application release; it is not yet Production evidence.

| Privileged action | Existing durable evidence / gap | Actor, scope, target, time, outcome, correlation |
| --- | --- | --- |
| Role definitions and module permissions | `save_role` atomic business RPC; no audit trigger/history in current catalog. New server append calls prepared for create/update/delete | Proposed actor from verified admin, GLOBAL scope, role-key digest, server timestamp, SUCCESS and request UUID; pending deployment |
| Workforce role/company/team/profile changes | Existing application metadata log; active validation has an existing atomic Sales RPC event | New metadata append prepared for generic successful user update; no field values, emails or names. Partial multi-step failures and direct writes remain gaps |
| Organization membership scopes | `replace_lilly_user_companies` records created_by for current grants, not deleted-grant history | New successful scope-change append prepared; GLOBAL scope, target UUID and `codes` field name only; no company-code values |
| Corporate teams/configuration catalogs | Current table catalog has no audit triggers | New successful create/update/delete append prepared for guarded catalog routes; target UUID, actor and field names only |
| Seller reassignment / Sales membership | Scoped controlled RPCs and `sales_history`; seller-admin audit source verified previously | Actor/member, organization, target, action/request/time in reviewed controlled flows; no live mutation executed |
| Sales team/direct configuration changes | Some scoped history exists, no blanket trigger on `sales_teams`/`sales_team_members` | Direct client/service/SQL changes and completeness remain unverified; do not assume corporate catalog events cover Sales tables |
| Protected schema changes | GitHub protected run/commit, formal reviewers, phase outcomes and non-sensitive checks; Postgres log_statement=ddl | Attendance run 40734062681 PASS. New audit proposal requires a separate exact-commit gate. Export/review/retention ownership still pending |
| Privileged QBO OAuth/disconnect/refresh | Scoped state/history and provider outcome records; worker identity differs from initiating human | Reviewed operation context exists; complete human attribution for every refresh/diagnostic not established. QBO code unchanged |
| Manual payment evidence / membership actions | Controlled RPC history carries actor/member, organization, resource and request UUID | Reviewed evidence/issue/review/reassignment flows recorded; no payment or manual membership action invoked for this task |
| Archive / restore | Controlled lead-archive history; protected infrastructure operations use platform approval records | Storage/archive-document counts zero, no restore executed. Universal restore/operator audit completeness not verified |
| Privileged patient record access | Legacy medical client reads via RLS; pgAudit not installed/enabled, pgaudit.log=none | Complete durable per-reader/per-resource read auditing NOT VERIFIED; enabling statement/body logging can leak PHI, so no unsafe logging was enabled |

## Prepared safe improvement and limits
Private `native_security_privileged_events` table with RLS, no browser/service direct table privileges and no Realtime exposure. Only a service-role append RPC can write; a fixed action/field allowlist prevents free-form payloads. Actor and resource identifiers are UUIDs; role keys are SHA-256 digests. Server clock supplies time; UUID request keys make retry insertion immutable/idempotent. No UPDATE/DELETE/purge RPC is provided. Authorized database operators retain access.

Business writes, guards and responses stay unchanged. The append is bounded to 1.5 seconds and post-commit. An unavailable append emits a sanitized `PRIVILEGED_AUDIT_NOT_PERSISTED` warning and preserves the business result. **This is not atomic audit completeness**: an interruption/failed append can leave a gap; a durable outbox/transactional integration and warning monitoring remain required for PASS. Direct database/client changes are not silently claimed as covered.

Isolated synthetic checks passed: browser execute denied, service table read/update/delete denied, unknown sensitive fields rejected, retries cannot overwrite evidence, and rollback revokes append while retaining rows. No production data used. Proposal/rollback/workflow are in `docs/releases/security-operations` and `.github/workflows/privileged-audit-guarded.yml`.

## Required operational decisions
Assign privileged audit reviewer and failure-alert owner; approve retention, review cadence, access/export handling, legal holds and offboarding; define bounded recovery of failed appends. Proposed review cadence: daily failure review, weekly privileged-action review, immediate incident escalation—**not adopted**. Immutable external retention/export cannot be assumed from provider logs. HHS documentation-retention rules do not automatically set the lifetime of every raw application log.

Remaining technical gaps: complete atomic recording of privileged writes/failures, direct paths and privileged patient reads; complete operator/worker attribution. A table or log alone does not make HIPAA Audit Controls PASS.
