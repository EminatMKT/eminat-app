# Patient Portal online renewal

## Commercial rules

Renewal opens 30 calendar days before expiry in America/New_York, matching the existing renewal-review window. A real, non-demo membership must be ACTIVE or EXPIRED and owned by the authenticated, verified Patient Portal identity in EMC. A canceled, pending, legacy-unpriced, or unrelated membership is ineligible. Existing plan, type, duration, seller, team, member code and covered household are preserved.

Month-to-Month renewal charges **one month at the existing monthly rate, including the existing $10 surcharge** (owner confirmed October 26, 2026). It does not repeat the initial two-month advance. Fixed-term renewal retains the existing catalog price and term. This release does not implement a plan/type change as part of renewal.

The pending quote is immutable once an invoice job exists. One pending intent per patient/membership, one invoice job per intent and Opportunity, unique provider invoice mappings, and a unique renewal-period/payment binding prevent duplicate billing or extension. Repeating a request returns its existing intent. A reused request key cannot target a different membership.

## Agreement and payment boundaries

A renewal may reference immutable v5 acceptance evidence from a fulfilled intent for the same member, identity, plan, type and duration. This is an evidence reference, not a fabricated new acceptance. Without that evidence the existing agreement acceptance flow is required. A different required agreement version fails closed until its documents, storage and acceptance policy are explicitly deployed; it cannot silently reuse v5.

Invoice issuance reuses the existing QuickBooks durable pre-write and uncertain-write recovery machinery. OAuth, webhook verification and the provider payment decision remain unchanged. Reconciliation re-reads the provider Invoice and linked Payments before calling the atomic extension function. The database also requires verified, non-demo, exact-amount payment evidence bound to the renewal Opportunity, authorized verifier and valid agreement.

No period changes on intent, quote, invoice, unpaid/partial/rejected payment, or cancellation review. On verified payment, the new period starts at the later of the previous exclusive expiry date and verified payment date. Calendar month addition clamps month ends. The same membership/code and household remain; a new auditable period is appended once. Concurrent changes to the quoted base expiry are held for review rather than overwritten. Email opt-out suppresses only confirmation delivery, never extension. Renewal confirmation has a stable event ID distinct from initial activation.

## Cancellation and void

An unbilled intent may be canceled idempotently. A fully linked unpaid invoice requires cancellation review. An uncertain invoice write, reported/verified payment, or fulfilled renewal cannot be canceled through this path. Existing authorized Finance/admin void confirmation records the externally verified void before final cancellation; this release does not send a provider void/refund request. Canceled/review intents cannot activate coverage. Historical intent, invoice, period and audit evidence remain.

## Release verification

`native-sales-online-renewal.sql` is an isolated CI transaction with simulated provider evidence, rolled back in full. It exercises Individual/Family, active/expired, eligibility, retries, invoice deduplication, unpaid protection, consent reuse, opt-out, membership/code/owner/household preservation, reporting and supported cancellation/void handling. Unit tests cover provider recovery, payment re-read, API ownership, price/date boundaries and confirmation replay. No rehearsal is permitted against Production.

Production verification is read-only: inspect existing Sales/Portal surfaces, deployed commit, QBO connection and worker health. Do not create an invoice, payment, user, Contact or membership to verify the release. Keep the preceding LILLY deployment and Portal image for rollback. Apply the reviewed additive migration only through the guarded schema workflow and restore Vercel Ignored Build Step to `Don't build anything` after release.
