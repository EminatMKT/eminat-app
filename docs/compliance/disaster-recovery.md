# Disaster recovery: database and files
Reviewed 2026-10-28. Procedure DOCUMENTED; actual restore drill **NOT VERIFIED**. Reason: the provider's isolated physical restore requires paid compute. **No paid resource created, no money spent, PITR not enabled.** No Production restore/cutover is authorized by this document.

## DATABASE BACKUP — verified
Production Supabase project `ruedelunbtaomhrzgelc`, Pro plan. Provider-managed daily physical backups, approximately midnight in the project region. Seven-day retention window; eight completed backups visible at the boundary (October 21–28). Latest completed: **2026-10-28 05:28:43 UTC**. Rechecked in Scheduled backups without selecting Restore. Preserve the backup inventory and check for failed/missing days before any recovery.

Supabase operates the backup infrastructure. The organization's accountable backup owner, incident commander, restore operator and recovery approver remain **UNASSIGNED / NOT VERIFIED**. Provider ownership does not replace customer responsibility for monitoring and testing.

PITR remains disabled. Pro supports a paid add-on with minimum Small compute. Physical project restore copies database/auth data and sensitive configuration; it does not reproduce every service setting. Recovery depends on provider availability, roles/passwords, Auth configuration, DNS/application deployment, server-only secrets, private file restoration and reconciliation. Never print these secrets in evidence.

## STORAGE OBJECT BACKUP — separate
Database backups contain Storage metadata, **not object bytes**. They cannot recover files deleted after the database backup. Restore-to-new-project excludes Storage objects/settings, which require separate configuration and recovery. Current live inspection: one private `sales-membership-archive` bucket, **0 objects**, and **0 archive-document rows**. Current membership cards are generated on demand; persisted agreement/selection data is in Postgres. No patient file was downloaded. See storage-recovery.md for scope and the future-object strategy.

No independent object backup is verified. Its absence currently affects no objects in this project; this must be reassessed before importing/uploading files or enabling a new store. Other hosts' full file inventories are outside this verified Storage inventory.

## Recovery procedure — documented, not exercised
1. Incident commander records incident, approved destination, scope, freeze/reconciliation point and operator. Owner verifies backup completion, timestamp, retention and object inventory. Approve any cost separately; this task authorizes **zero spending**.
2. Preserve the existing project, deployment, secret store and non-sensitive configuration manifest. Do not select in-place Production Restore or change DNS during a drill.
3. When separately funded/authorized, use provider Restore to a new private project in the approved region. Confirm destination identity differs from Production; keep external mail, QBO, webhooks, schedulers and public applications disconnected. Recheck scheduled jobs/extensions before enabling connectivity.
4. Validate schema, RLS, grants, definer paths, constraints and aggregate counts against the backup timestamp using `docs/releases/security-closure/restore-drill-validation.sql`. Do not display rows, emails, Auth hashes or file names. Explain legitimate post-backup differences.
5. Restore object bytes and bucket policies separately if objects exist. Reconnect file pointers only after hash/count verification; test with a synthetic canary. Validate Auth/redirect configuration, API denials and application health without sending mail, executing QBO mutations or making payments.
6. Record start/end time, measured data gap, failures and sanitized integrity results. Business owner accepts recovery and separately approves a Production cutover, if actually needed.
7. A separately authorized temporary project must be retired through the normal deletion confirmation and billing verification. No such project exists from this task.

## Rollback and retention
A failed drill leaves Production untouched. For an actual approved cutover, retain the original project and application deployment; document post-cutover writes before reversing routing to avoid losing newer records. Application rollback is separate from database restore. Protected schema additions use check → formal approval → apply → formal approval → verify and reviewed non-destructive rollback. The new audit rollback revokes append access and retains event rows.

Actual RPO/RTO remain **NOT APPROVED / NOT MEASURED**. Proposed values and their limitations are in recovery-objectives.md. Do not present a tabletop review or synthetic schema test as a backup restore.

Sources: [Supabase backups](https://supabase.com/docs/guides/platform/backups), [restore exclusions](https://supabase.com/docs/guides/platform/clone-project), [HIPAA project requirements](https://supabase.com/docs/guides/platform/hipaa-projects).
