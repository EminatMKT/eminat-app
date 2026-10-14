# Phase C, step 1: Lead operations

ANNIE remains the commercial source of truth. LILLY sends Lead writes through its server-side adapter to the existing ANNIE API. The adapter does not write commercial records to Supabase.

## Activation boundary

- `ANNIE_SALES_QA_WRITE_ENABLED` defaults off. Phase B reads continue when it is unset.
- The existing exact LILLY user/Auth allowlist, active identity mapping, ANNIE native session, and ANNIE identity check apply before any write.
- ANNIE's `commercial:write` policy, record access, validation, version checks, transition rules, conversion transaction, and history remain authoritative.
- Enable the switch only for a controlled owner QA deployment after reviewing the exact build and confirming an unexpired ANNIE native session. Do not add normal users to the allowlist.

## Controlled write QA

Use one clearly named synthetic Lead in the approved ANNIE Organization. Record its ANNIE UUID and each returned version. Do not edit an existing staff or customer Lead.

1. Confirm the write switch is off: create, edit, transition, archive, and convert requests return `SALES_WRITE_DISABLED` without an ANNIE write.
2. With the switch enabled for the exact owner mapping, create a synthetic Lead in LILLY. Verify the same UUID, Organization, version, and `created` history entry in ANNIE.
3. Edit its follow-up, owner/team, and descriptive fields through LILLY. Verify the new version and `updated` history entry.
4. Move it through one valid status transition. Verify the new status and `stage.changed` history entry.
5. Submit an invalid transition and a stale `If-Match` version. ANNIE must return its own 409 errors; the Lead and history must remain unchanged.
6. Check unauthorized and unmapped callers cannot write. Check a caller mapped to another Organization cannot target the synthetic Lead.
7. Test archive and restore with a reason, then verify both history entries. Keep the test Lead clearly synthetic.
8. Test conversion only with a separate synthetic Lead and synthetic linked records. Reuse the same idempotency key for a retry; verify no duplicate Account, Contact, or Opportunity. Confirm the original ANNIE Lead ID is preserved.
9. For timeout or ambiguous network failure, refresh the Lead and ANNIE history and search before retrying. A create request has no idempotency key in ANNIE, so do not blindly repeat it.
10. Turn the write switch off after QA, and confirm Phase B owner reads still work. Roll back LILLY code by redeploying the last known good commit if needed; ANNIE remains operational throughout.

Do not begin Contacts or later Phase C write work until these checks pass through LILLY. No ANNIE redirect, commercial migration, dual-write, QuickBooks Production connection, or Stripe activation is part of this step.
