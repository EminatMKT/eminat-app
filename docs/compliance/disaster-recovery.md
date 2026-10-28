# Corazón Salud disaster recovery
Evidence inspected 2026-10-28 in actual Production project `ruedelunbtaomhrzgelc`. No restoration to Production is authorized by this plan.

## Verified configuration
Daily physical scheduled backups; Pro retention window seven days. Eight completed timestamps were visible across the retention boundary, October 21–28. Latest completed backup: **2026-10-28 05:28:43 UTC**. PITR disabled. Storage object bytes are not included in database backups. A separate Storage backup/restore process is NOT VERIFIED.

RPO: **NOT DEFINED**. RTO: **NOT DEFINED**. Daily scheduling is not an approved RPO or tested recovery time. Responsible incident commander, database operator, backup owner and business recovery approver: **OWNER ASSIGNMENT REQUIRED**.

## Isolated drill and cost gate
Use Supabase Restore to a new project, same organization and us-east-1 region, temporary Nano project. Source physical backup selected above. Quote: US$9.68/month compute, US$0/month disk. Owner authorized up to US$1 total. Automatic approval review rejected creation because the quoted monthly amount exceeds that cap and no enforced cap was demonstrated. **No clone created; no restore drill performed.** Never activate paid PITR or exceed the cap based on estimated prorating.

Source read-only preflight found no active cron jobs, pending HTTP requests or configured external extensions in the reviewed set. Recheck immediately before cloning. Clones contain sensitive Auth and application data; keep private, restrict operators, do not configure mail, webhooks or public application access. Disable any newly detected jobs/integrations on the isolated destination before enabling connectivity. Never reuse Production API keys in an application Preview.

## Restore steps
1. Incident commander approves scope, destination, budget and isolation; preserve original Production project and current application deployment.
2. Verify backup completed status and timestamp, source identity, storage backup availability and external-job preflight. Record non-sensitive evidence.
3. Create the isolated clone using provider-supported physical restore. Do not select in-place Production restore.
4. Verify destination project identity differs from Production. Inspect schema, RLS, permissions, invalid indexes, unvalidated constraints and representative aggregate row counts using `docs/releases/security-closure/restore-drill-validation.sql`. Do not print patient rows, secrets or Auth records. Count differences require explanation against the backup timestamp, not assumed corruption.
5. Verify Auth, Storage bytes, Edge Functions, configuration, Realtime and external service dependencies separately; provider clone does not copy all project settings/services. Test only controlled synthetic workflows without email or payment delivery.
6. Record elapsed recovery time, checks and limitations; obtain business acceptance before defining RPO/RTO.
7. Remove the temporary project after validation using the required deletion confirmation; verify removal and billing. Keep sanitized evidence, never patient exports.

## Recovery and rollback
A drill never changes Production routing, credentials or schema; stop and remove the isolated destination if validation fails. An actual incident requires a separate approved cutover, reconciliation window, data-integrity checks and communication plan. Preserve the original project and pre-cutover deployment as rollback; do not overwrite newer data blindly. Any schema correction uses schema_check → approval → schema_apply → approval → schema_verify, with reviewed rollback.

PITR recommendation: assess paid PITR against approved loss tolerance and incident scenarios; it can reduce the daily-backup recovery gap but does not replace Storage backups or restore testing. Obtain price/plan approval first.

Sources: [Supabase backups](https://supabase.com/docs/guides/platform/backups), [project cloning and exclusions](https://supabase.com/docs/guides/platform/clone-project).
