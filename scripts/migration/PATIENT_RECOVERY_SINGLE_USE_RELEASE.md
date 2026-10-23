# Patient recovery single-use release

The live controlled QA on 2026-10-22 showed that an already-used recovery link could reset the password again. This release adds an atomic, service-only claim for the SHA-256 digest of each verified recovery token. A second claim returns false before any password or patient-session mutation. No token or password is stored in the new table.

## Production order

1. Review this focused change and pass CI. Confirm that the pending schema set contains only `20261023040000_native_sales_patient_recovery_single_use.sql`.
2. Run the protected `schema_check` at the reviewed commit. Confirm a current restorable Production backup. Obtain separate approval before `schema_apply`.
3. Run `schema_apply`, then `schema_verify`; confirm the new table and service-only function without changing existing business rows.
4. Deploy the matching runtime through the normal protected Production path, retaining the previous deployment for rollback. Do not deploy the runtime before the migration: it fails closed with 503 when the claim function is absent.
5. With a controlled patient, use a new recovery link once, then ask the owner to attempt the *same* link again. The second attempt must return a generic invalid-link state and leave the password unchanged. Do not enter passwords or codes on the owner's behalf.

## Rollback

If the new runtime fails operationally, restore the previous deployment and investigate before re-enabling password recovery; the previous runtime allowed token reuse. Keep the claim table and its audit rows. A schema rollback, if necessary after a safe runtime rollback, removes only the new function, index, and table after retaining the token-claim audit. No existing patient, Sales, payment, or invoice rows are changed by this migration.
