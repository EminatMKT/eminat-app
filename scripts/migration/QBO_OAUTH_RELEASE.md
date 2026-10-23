# PR #155 Production release gate

Intuit Compliance is Approved and Production credentials are unlocked. The previously exposed Production webhook verifier must be rotated and the replacement stored only in the protected LILLY Production secret before enabling OAuth. PR #163 carries the schema separately so the protected workflow can validate a commit on `main` before PR #155 deploys the runtime.

## Schema gate

1. Confirm a current restorable Supabase Production backup and record its timestamp.
2. After PR #163 passes CI and merges through the protected flow, run the existing protected GitHub `schema_check` for Production against that exact `main` commit. It must detect the migration secret, pass `SALES_SCHEMA_CAPABILITY_PASS`, and report only `20261022230000_native_sales_qbo_oauth_state.sql` pending.
3. Review the affected objects: `sales_qbo_oauth_states`; the two refresh-lease columns on `sales_qbo_connections`; the unique existing-invoice-reference index on `sales_patient_qbo_manual`; and the claim, finish, refresh, hold-for-revocation and disconnect functions. No existing business rows are backfilled, deleted or changed by the migration.
4. Obtain separate owner approval at the protected `schema_apply` gate. Do not execute SQL manually.
5. Confirm `schema_verify` passes and that version `20261022230000` appears exactly once in Supabase migration history.

The reviewed rollback is `scripts/migration/rollback_native_sales_qbo_oauth_state.sql`. It is intentionally blocked once OAuth state or token ciphertext exists. If a real connection has been authorized, disconnect/revoke through the approved operational path first, preserve the audit, and plan a maintenance rollback. Never run the rollback automatically.

## Post-unlock deployment sequence

1. Add `LILLY_QBO_CLIENT_ID`, `LILLY_QBO_CLIENT_SECRET`, `LILLY_QBO_TOKEN_KEY` and `LILLY_QBO_REDIRECT_URI` to Vercel Production without exposing their values. Leave `LILLY_QBO_OAUTH_ENABLED=false`.
2. Register exactly `https://app.stratixsolutions.us/api/sales-native/quickbooks/oauth/callback` in Intuit Production.
3. Complete the protected schema gate above, then merge PR #155 through normal review and deploy its commit to Vercel Production. Verify the deployed commit and health before changing the enable flag.
4. Set `LILLY_QBO_OAUTH_ENABLED=true`; authorize only the verified Eminat Medical Center LLC realm. The realm mapping is stored in `sales_qbo_connections`, not in an environment variable.
5. Verify read-only company probe, encrypted token storage, refresh rotation, disconnection/revocation, signed webhook intake, and the authenticated reconciliation cron. Confirm no client-visible token data.
6. Reconcile controlled invoice and payment events with read-only QBO API calls. Do not activate on a webhook alone, partial balance, missing patient binding, or a deleted/reversed payment. Missing profile/address remains pending. Real invoice creation and final payment E2E require their own controlled approvals.
