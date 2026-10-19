# Native Sales schema release for eminat-app

This release uses the existing Supabase Production project `eminat-app` (`ruedelunbtaomhrzgelc`). It does not import ANNIE demo commercial records, create a second database, or change Research, Tasks, Meetings, Meet, or Auth data. The legacy ANNIE import and paid isolated-restore workflows were disabled and removed from this release.

## Before apply

1. Review the exact default-branch commit and the digest printed by `check-native-sales-migrations.py --print-digest`. Confirm that only reviewed `native_sales_` migrations are pending and that migration versions are unique.
2. Record the completed October 19, 2026 scheduled Production backup timestamp (`05:25:41 UTC`) and verify in Supabase that the backup remains available. Pass the backup identifier and timestamp to the guarded workflow. A Production environment reviewer must approve the run.
3. Confirm the protected `LILLY_SALES_SCHEMA_ADMIN_DB_URL` points only to `eminat-app`. It is used only by the guarded schema and one-person staff-binding workflows. Do not use a data-import role or application credential.
4. Run the workflow in `check` mode. It validates the exact commit, migration digest, owner capability, pending migration set, the existing public login page (HTTP 200), dry-run SQL, and a count/schema fingerprint of existing modules. Stop on any mismatch.

## Apply and verification

Run `apply` only with the same reviewed commit and digest. The workflow checks the backup evidence, applies the pending additive Native Sales migrations, then verifies migration history, the unchanged pre/post count and unrelated-schema fingerprint, and public web availability. The database checks in the same workflow are the database readiness proof; `/api/health` is not deployed in the current LILLY release. Existing Sales rows are not required to be empty and are never deleted by the release workflow.

Each migration is a separate migration unit. A failed apply must stop; never rerun blindly or mark a partially applied set complete. Inspect migration history and the failed migration before deciding whether to retry. Keep the current application release available for code rollback. The new additive Sales objects can remain unused behind the default-off Native Sales gate while the issue is corrected. Any database recovery from the scheduled backup requires its own reviewed recovery action; this workflow never restores over Production.

After apply, verify login, users, organizations, Research, Tasks, Meetings, Meet, and LILLY health. Use synthetic Sales QA only. Keep ANNIE intact and QuickBooks Production, Stripe, real payments, and live Meta authorization disabled.

## Controlled Seller binding

After the schema is verified, the separate `native-sales-guarded-staff.yml` workflow checks the existing active, approved LILLY/Auth/tenant binding for `marketing@eminat.net`. An email match alone cannot grant access. The workflow is pinned to a reviewed default-branch commit and binding-SQL digest, requires Production approval, and can add only one native `SELLER` membership in the already approved organization. It does not grant administrator access, import commercial rows, or change any unrelated user. Run `check` first, then `apply` only if the explicit mapping and company access are present. The SQL runs in one transaction and fails closed on conflicting roles or organizations. A later revocation can set that Sales membership to `revoked` without deleting identity or audit history. Additional real staff roles require their own explicit approved bindings.
