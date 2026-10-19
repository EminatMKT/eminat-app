# Native Sales guarded migration

The schema and commercial import use separate GitHub Actions workflows and database principals. Both workflows are manual, pinned to an exact commit on `main`, and use the protected `Production` environment. Merging these workflows does not run them. The Native Sales UI and primary cutover gates remain off. No real import has been authorized for this release.

## Security domains

| Phase | Workflow | Private credential | Allowed operation |
| --- | --- | --- | --- |
| Schema | `native-sales-guarded-schema.yml` | `LILLY_SALES_SCHEMA_ADMIN_DB_URL` | Check/apply reviewed native migrations, including the `public.usuarios` constraint that requires table-owner capability |
| Data | `native-sales-guarded-import.yml` | `LILLY_SALES_PRODUCTION_DB_URL` | Read required references and insert/update the 20 approved Sales target tables only |
| Archive | Import workflow, Storage job only | `LILLY_SUPABASE_SERVICE_ROLE_KEY` | Upload and verify only migration-prefixed historical PDF objects |

The data login must have no superuser, role/database creation, RLS bypass, public-schema CREATE, ownership of `usuarios`, DELETE on target tables, or write on unrelated public tables. The SQL in `scripts/migration/lilly-sales-migrator-role.sql` creates the narrow login only after schema verification; `lilly-sales-migrator-revoke.sql` removes it after cutover. Both use a placeholder password, never a real credential. The role's RLS policies are scoped to the 20 import tables. This role does not run `supabase db push`.

The Production environment still requires an authorized administrator to provision the two separate DB secrets and a narrow private ANNIE export reader. Do not substitute an owner connection into the limited role secret. The prior exposed classic GitHub PAT remains a separate security gate until its revocation is confirmed; do not use it for the export reader.

## Exact release and source gates

The dispatch commit must be the current `main` SHA. `check-native-sales-migrations.py` verifies the SHA-256 digest of the ordered Native Sales migration filenames and contents, migration IDs, the pending set, and the applied set after schema application. No unrelated migration may be pending. The private ANNIE export is downloaded only on the runner from a successful authorized run. Its encrypted artifact, normalized rows, manifest, and PDFs are hash checked; 334 normalized target rows must be present. The importer requires the source snapshot to be at most four hours old. No customer rows, PDFs, object keys, or secrets are workflow inputs or logs.

The 334 count is **normalized destination rows**, not a count of unique people or raw ANNIE source records. The private manifest has exact per-table `destinationCounts`; emit only those aggregate counts for the release reviewer. The reviewed earlier source inventory contains 17 Leads, 18 Contacts, 12 Accounts, 6 Account–Contact links, 13 Opportunities, 8 memberships, 11 periods, 160 history events, 28 historical staff actors, and 11 deferred Contact primary-account links. Do not reconstruct the complete 334 breakdown from this partial inventory; obtain it from the fresh manifest before a real import.

## Backup and recovery gates

Before **schema apply**, record the exact LILLY Production project, current migration version, unrelated public schema fingerprint, `usuarios` count, organization/tenant mapping counts, and empty Sales target counts. Create a restorable Production database snapshot and verify an isolated restore. Record the backup identifier, UTC time, restore run, schema version, and aggregate counts in a protected release record. A typed backup identifier or unchecked checkbox is not proof of restore. The schema workflow currently accepts backup/restore references but cannot independently verify their origin; therefore **schema apply remains blocked until a reviewed independent proof mechanism is attached**.

The schema rollback is restore from that verified recovery point, not a blind DOWN migration. Do not restore the whole live database automatically if unrelated writes occurred afterward. Compare the isolated restore's user/organization counts and migration history before deciding any live recovery. The data import's SQL executes inside one transaction; failure before COMMIT rolls it all back. The Production rehearsal uses the same 334-row SQL and ends with ROLLBACK, then rechecks that all 20 target tables remain empty. If post-commit reconciliation fails, keep native Sales disabled and use a separately reviewed targeted cleanup or isolated verified recovery. No cutover is permitted with an unexplained mismatch.

Historical PDF objects use `native-sales/<rows-sha256>/...` inside the private archive bucket. Uploads never upsert. A controlled Storage rehearsal writes, reads, and deletes a synthetic object. The archive command verifies every uploaded object's SHA-256 and records metadata only after verification. On an in-process failure it removes only objects and metadata created by that invocation. A process crash can leave an object under the migration prefix; reconcile that prefix against the private manifest before retry or cleanup. Never delete pre-existing objects or unrelated Storage paths.

## Dependency order

1. `schema_check` verifies exact release, owner capability, current migration history, health, and reviewed pending schema.
2. `schema_apply` may run only after the verified Production snapshot and isolated restore gate. It processes no ANNIE rows or PDFs.
3. `schema_verify` checks the applied set, empty targets, unrelated schema fingerprint, users count, and health.
4. `data_rehearsal` requires verified schema and uses the limited role. It rolls back the 334-row transaction, proves empty targets, and rehearses synthetic Storage cleanup.
5. `data_import` requires rehearsal, separate protected approval, and a successful independent isolated-restore proof run. It is **not authorized to run yet**.
6. `storage_archive` runs only after committed import.
7. `reconciliation` runs only after committed import and archive.
8. `final_verify` runs only after all prior jobs and checks migration state and health. Separate browser and role QA is required before cutover.

If a required secret, approved proof run, fresh export, destination schema, capability, checksum, or protected environment is absent, the workflows fail closed. Do not pass private data through Supabase SQL Editor, MCP SQL, browser console, workflow inputs, artifacts, or repository files.
