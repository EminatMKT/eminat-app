# Sales organization context and approved EMC access

The existing Sales page accepts exactly one active membership and has no organization selector. Freddy has an active Stratix SUPERADMIN membership and a pending EMC SUPERADMIN membership. The EMC membership's original approval is a foreign-key-safe Patient Portal fallback owner, not a global access grant. Native Sales SUPERADMIN remains organization-scoped.

The owner explicitly approved activating that existing EMC membership and allowing the same exact fallback member to be pending or active in the profile-save guard on 2026-10-25. The existing user, Auth binding, membership ID, role, and fallback evidence remain intact. No new membership is inserted. Activation uses the controlled-binding RPC pattern and records one audit event; repeating it is a no-op.

The page lists only the login's active memberships in active organizations. A single membership preserves existing navigation; multiple memberships require an explicit `organization` query parameter before any records render. The organization form performs a full navigation, and the selected record component is keyed by organization to discard prior state. Every data API continues to validate the selected organization header against the exact login's active membership. Discovery does not aggregate roles or capabilities. Invalid/pending/revoked organizations are denied.

The compatibility migration replaces only `status='pending'` with `status IN ('pending','active')` in the existing exact-identity profile function. A regression test compares the complete function bodies. Contact/identity/Lead synchronization, email, invoice/payment behavior, agreement enforcement, and assignment remain unchanged.

## Assignment audit

The existing real Portal Lead was already created by the profile-save transaction. Its history identifies `configured_round_robin`; the assigned active EMC seller is Gabriel Negrete, distribution position 2. The assignment membership evidence is `owner-approved-emc-sales-2026-10-20`, and the distribution entry is enabled. The configured rule alternates eligible active members of Corazón Salud Sales. When no approved eligible rule exists, the unchanged function uses the administrative holding owner, creates a NEW Lead, and exposes it as NEEDS_ASSIGNMENT. No reassignment is part of this release.

## Release sequence

1. Require green unit, type, lint, build, database rehearsal, and browser CI for the exact commit.
2. Confirm a current restorable Production backup and exact current profile function definition.
3. Apply only `20261025160000_native_sales_organization_context.sql` transactionally and record its migration version. This defines the guard and controlled RPC; it does not activate membership.
4. Deploy the reviewed organization-selector runtime with existing environment settings. Confirm single-organization access still works.
5. Run the owner-approved `native_sales_controlled_emc_admin('check')`, then `'apply'`, then `'verify'` using the normal controlled server/database operator path. Do not insert/update the membership directly.
6. Refresh Freddy's existing session, explicitly select EMC, and read the existing real Portal Lead. Switch to Stratix and verify its records remain isolated. Check no invoice, payment, or membership was created.

Rollback: while the new runtime is still live, revoke only this approved EMC access through a separately reviewed controlled action before returning to a single-organization runtime. Do not restore the pending-only profile guard while this EMC membership is active. Preserve the prior deployment and function definition. No ANNIE, QBO, Patient Portal frontend, seller distribution, or other organization membership changes are required.
