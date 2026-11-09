# Recovery objectives
**PROPOSED — REQUIRES BUSINESS APPROVAL**
Prepared 2026-10-28. Policy approver: [UNASSIGNED]. Approval record/date: [PENDING]. No policy is adopted and no recovery time has been measured.

| Item | Current evidence | Proposed objective / acceptance condition |
| --- | --- | --- |
| Database backup frequency | Daily physical backups, seven-day window | Daily owner review and alert for missing/late backups, proposed only |
| Database RPO | Latest successful backup 2026-10-28 05:28:43 UTC | **24 hours**, planning target pending business acceptance and a mechanism that reliably meets it |
| Essential-service RTO | No completed restore exercise | **8 hours** from incident declaration to validated essential service; estimate only, not an SLA |
| Object recovery | Current bucket empty | Establish separate object RPO/RTO before first critical object upload; proposed alignment to 24h/8h requires testing |

## Data-loss reality
With daily completed backups, loss can approach one backup interval **plus scheduling delay and backup lag**. Observed daily timestamps vary, so a strict 24-hour ceiling is not proven. If jobs fail, usable backups expire, or the provider is unavailable, there is no finite demonstrated maximum loss. Seven-day retention is a recovery window, not a seven-day RPO. Newer application/financial events must be reconciled after restore without creating duplicate invoices or payments.

## Dependencies and scope of the 8-hour proposal
Provider provisioning/restore duration, dataset size, incident staffing, approved private destination, recoverable secrets and roles, Auth/DNS, application rollback/build, RLS/security validation, files if introduced, and external-integration reconciliation. Essential service means validated access to recovered membership/operational information; financial transactions and reactivation of integrations require separate reconciliation approval. No paid or real-payment exercise is implied.

## PITR decision
**REVIEW** for meeting the proposed objectives. Daily backups alone do not prove the strict 24h target. If business requires a guaranteed 24h ceiling or a shorter RPO, evaluate additional tested backups or PITR; do not assume a schedule meets a guarantee. PITR narrows the database recovery gap, does not back up Storage bytes, and cannot guarantee the 8h RTO.

PITR remaining disabled leaves all writes since the last usable daily backup exposed to loss. Supabase currently quotes approximately US$100/month for seven-day PITR, plus a minimum Small compute requirement; confirm account-specific price before any purchase. No add-on is enabled. Separately, Supabase lists PITR among its required High Compliance configuration controls for PHI projects; business/legal review must address that conditional vendor requirement even if a longer RPO is accepted.

## Business approval record
- [ ] Approve/reject the impact of losing up to the target interval of registrations, consent, membership and operational updates.
- [ ] Approve/revise 24h RPO and 8h RTO; identify safety/clinical exceptions and alternate manual operations.
- [ ] Assign backup owner, incident commander, operator, verifier and alternate with contact evidence.
- [ ] Approve funding only through a separate explicit decision, or revise objectives to demonstrated zero-additional-cost capabilities.
- [ ] Conduct an authorized isolated restore; measure actual recovery/data gap and revise these estimates.
- [ ] Record signature/date/version and review after material architecture changes and at the proposed annual risk review.

Source: [Supabase backup frequency, PITR pricing and limitations](https://supabase.com/docs/guides/platform/backups).
