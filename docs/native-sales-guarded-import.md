# Native Sales Production import gate

This manual workflow stages ANNIE commercial data in LILLY. It does not activate
the imported organization, bind historical staff logins, deploy the app, or cut
over traffic. The source artifact and normalized rows remain private on the
ephemeral GitHub runner. Never place customer rows in the public repository,
Supabase SQL Editor, MCP calls, browser console, workflow inputs, or job logs.

## Required Production environment controls

The existing `Production` GitHub environment must have required reviewers before
dispatch. The workflow rejects an environment with no `required_reviewers` rule.
The reviewer must verify a restorable pre-import Supabase database backup and
the exact reviewed commit. A daily backup does not include Storage objects.

Provision these four values only as `Production` environment secrets:

| Secret | Scope |
| --- | --- |
| `ANNIE_EXPORT_READ_TOKEN` | Read Actions artifacts and repository contents from private `EminatMKT/annie` only |
| `ANNIE_EXPORT_PRIVATE_KEY` | Decrypt the approved ANNIE commercial export only |
| `LILLY_SALES_PRODUCTION_DB_URL` | LILLY Production PostgreSQL direct/session-pooler connection only |
| `LILLY_SUPABASE_SERVICE_ROLE_KEY` | LILLY Production private Storage archive only |

Do not source these values from a bulk download of Vercel Production variables.
They must be provisioned through an authorized scoped handoff. The workflow
fails before database access if a secret, reviewer rule, SHA, backup timestamp,
or export artifact is missing. Use a fresh ANNIE export: the importer rejects a
source snapshot more than four hours old.

## Execution and recovery

The `rehearsal` dispatch (default) reads the Production migration history and
tests the pending migration set with the CLI's dry-run; it performs no schema
or customer-data writes. A separate `import` dispatch is required to apply
the additive schema and load rows.

The workflow checks the encrypted artifact checksum before decryption; decrypts
only on the runner; validates the 334 source rows, manifest, and PDFs; and
checks that only the reviewed native Sales migrations are pending. It then
applies those additive migrations, imports into empty native Sales tables in
one transaction, compares the committed relational projection to the source,
and archives ten historical PDFs in private Storage. Any failed gate stops
before cutover. The importer rolls back its transaction if an insert or its
in-transaction counts/constraints fail.

The database transaction cannot also include Supabase Storage uploads or the
separate migration CLI. If post-commit reconciliation or archive verification
fails, keep native Sales disabled and investigate privately. Restore the
verified pre-import backup or use a separately reviewed targeted recovery plan;
never automatically restore the whole database, because unrelated writes may
have occurred after the backup. Partial archive uploads are hash-checked and
can be retried idempotently. Do not mark rollback fully prepared until its
restoration path is reviewed for this specific run.

For Storage recovery, derive the exact object keys from the private manifest,
verify each existing object hash against that manifest, and remove only matching
`sales-membership-archive` objects and their matching archive metadata rows.
Do not delete an object if its hash differs or its metadata has changed. Keep
the organization `pending` and staff `historical` throughout recovery. Record
aggregate removed/remaining counts only; never log keys, PDFs, or customer
identifiers. Because Storage cleanup cannot share the database transaction,
verify all ten objects and all ten metadata rows after cleanup, and retry only
the remaining verified items if interrupted.

After a successful run, independently verify Production schema, record counts,
membership codes, PDF hashes, disabled access state, and application health
before any separate release or cutover decision.
