# Native Sales Seller administration release

The migration `20261023010000_native_sales_seller_admin.sql` adds one service-only
function. It changes no existing member, patient, lead, opportunity or assignment
row. An active LILLY administrator can grant or revoke `SELLER` for an existing
verified LILLY account in an active Sales organization. Patient Portal identities
and users holding another Sales role are rejected. Every transition writes a
Sales history record in the same transaction. The Gigi/Gabriel assignment order
is never modified.

## Protected Production sequence

1. Confirm a current restorable Supabase Production backup and run the protected
   `schema_check`. Its pending list must contain only this migration.
2. Obtain separate approval for `schema_apply`. Do not apply SQL manually.
3. Confirm `schema_verify` and migration history, then merge the reviewed PR and
   deploy the matching application commit.
4. In Admin → Sales access, use an existing controlled staff account to verify
   grant, login, EMC Sales scope, revoke and denial. Keep the account outside
   patient assignment order. Verify audit entries and organization isolation.
5. For rollback, first return the prior application deployment, then apply
   `rollback_native_sales_seller_admin.sql` through the protected process.
   Membership and audit rows remain intact.
