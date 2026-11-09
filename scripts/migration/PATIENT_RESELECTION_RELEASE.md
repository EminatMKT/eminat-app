# Patient Portal reselection release

Production QA exposed a real defect: after cancelling an unbilled selection,
a fresh selection created a second Opportunity. The
first remained Lost and the second Payment Pending. No invoice or payment was
created for this QA identity.

`20261023020000_native_sales_patient_reselection_opportunity.sql` changes only
the active-intent uniqueness index and the Patient Portal intent trigger. A
cancelled selection keeps its history. On reselection, its Opportunity is reused
only when it belongs to the same patient/contact, is Lost, and has no QBO
evidence, payment, or membership. Billed or paid flows remain separate.

The migration does not backfill or alter existing patient, invoice, payment,
membership, or Opportunity rows. The already-created QA Opportunities remain
historical and must not be silently rewritten. No QuickBooks action is part of
this release.

## Protected release

1. Review CI, confirm a current restorable Supabase Production backup, then
   merge by the protected PR workflow.
2. Run protected `schema_check` on the exact merged commit. Confirm this is the
   only pending schema migration. Obtain separate approval for `schema_apply`.
3. Apply through the protected workflow and verify migration history and the
   function/index definitions. Never paste the migration into Production SQL
   Editor.
4. Deploy the same commit. On one controlled, unbilled Portal QA account,
   select, cancel, reselect, and confirm the Opportunity ID is unchanged, with
   one active enrollment and one canonical Opportunity. Verify no invoice,
   payment, or membership activation.

## Rollback

Restore the prior application deployment first. The previous trigger body is
in `20261020120000_patient_emc_sales_operations.sql`. A full schema rollback
requires the verified database backup if any reselection has already linked
multiple historical intents to one Opportunity: recreating the prior global
unique index would otherwise fail. Do not remove historical links or audit
records to force that index back.
