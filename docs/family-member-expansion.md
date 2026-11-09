# Corazón Salud family expansion

Scope: Patient Portal family selection/preparation and its native Sales membership/family/payment surfaces. No Sales navigation/dashboard, OAuth/webhook architecture, Medical, unrelated modules or manual Production business-data changes.

## Approved rules

- Family includes primary A plus B/C, three people total. Additional purchased places range 0–9, maximum 12 currently covered people.
- Exhibit A-3 monthly additional-member rates: Essential 4,999 cents, Plus 6,999, Max 8,999. No second $10 surcharge is added to these rates.
- Initial purchase additional fees cover the existing initial paid months (2 for Month-to-Month, otherwise 3/6/12). Renewal covers the existing renewal term (1 for Month-to-Month). Base prices remain unchanged.
- Owner clarified: retain staff approval BEFORE invoice issuance. Approval alone never provides entitlement. Editing a prepared person's identity invalidates that approval. Approval follows existing EMC administrator/manager organization/team policy; sellers cannot approve.
- All extra-member details and the quote must be final, staff-approved and locked before claiming an invoice job. Current v5 acceptance/reuse rules remain in force. No invoice is modified after provider issuance.
- Verified provider payment is the only activation boundary. Unpaid, partially paid, uncertain, canceled or mismatched invoices cannot activate people. New people receive independent Contact/household identity and plan visit allowance; root member identity, seller and household history remain.
- Codes use the same root and monotonic alphabetic suffix; removed historical codes are never reused. Active capacity and historical code sequence are separate.

## Deterministic proration

Existing source contains no proration formula. v5 Exhibit A-3 specifies the monthly rate prorated for remaining months. Use `CALENDAR_MONTH_DAYS_V1`: divide each already-paid membership period into calendar-month cycles anchored to that period's start, clamping month ends exactly like existing membership dates. Sum each remaining cycle's charged days / actual cycle days. Round half up to cents once per additional person, then multiply by the number of people. Persist dates, cycle fractions, rate, unit cents and total for audit and use those exact unit cents/quantity on QBO. Reject unpaid gaps, overlaps, invalid dates and zero remaining coverage. Do not use a flat 30-day approximation.

For example, adding two Essential people on February 15, 2026 with coverage ending April 1 (cycles anchored January 1) charges 14/28 + 1 months per person: $74.99 × 2 = $149.98.

## Existing architecture to extend

Reuse enrollment intents (new FAMILY_ADDITION purpose), invoice jobs, patient family drafts, family requests, household members, code registry, v5 acceptance evidence and existing provider reconciliation. Additional intent quote fields are immutable after a durable invoice claim. Family preparation reviews use existing roles/team boundaries; activation after verified payment reuses reviewed family requests and code issuance. No parallel patient/family database or direct Portal database connection.

An additional-member purchase against an ACTIVE Family membership creates a separate scoped intent/Opportunity/invoice and does not change the original invoice or membership dates. Concurrent renewal/addition billing intents are serialized. Renewal snapshots the active paid additional people and includes them in its total; pending additions never become covered by renewal.

## Release gates

Synthetic fixtures only: no real charge, provider invoice, user or manual Production record. Test quantities 0/1/2/3/5/9, bounds, edits/decrements, approvals, quote snapshots, precise provider lines, uncertain-write recovery, verified-only activation, codes and removed-code history, prorated active additions, Family renewal, ES/EN/mobile, seller and tenant isolation. Required CI + protected Preview before merge; reviewed additive migration only through the existing guarded workflow; exact merge deployment with prior LILLY deployment and Portal image preserved; Ignored Build Step restored to `exit 0`.

## Reviewable Portal release

Portal commit `2253a66e3e81bf5a415baea84cd0f38a1caeb645` is a separate application. `releases/family-expansion/portal.patch` is its exact binary-capable patch against deployed `794e647a823c2f3601457630504c48cbe5b30267`; `manifest.json` binds the tree, patch digest and checked production build. No agreement PDF changed.

Local validation: LILLY production build, TypeScript, lint (existing warnings only), 2,453 unit tests; 13 isolated SQL rehearsals including Family +0/+1/+2/+3/+5/+9, quote edits and approval reset, supplemental invoices, verified-only activation, monotonic historical codes and expanded renewal. The disposable vanilla PostgreSQL rehearsal omits the unavailable Vault extension only; unmodified Supabase schema and browser CI remain mandatory. Portal: production build and fixture-leak/official-PDF checks, TypeScript, 196 unit tests, English desktop and Spanish mobile family browser checks. LILLY staff review has equivalent synthetic browser coverage in both languages, including mobile dark mode, without contacting Production or QBO.

Portal changed-file lint passes. Full Portal lint retains the pre-existing out-of-scope `src/app/(portal)/error.tsx` effect error and five image warnings; that file is unchanged. No unrelated error-page refactor is bundled into this family release.

The hosted Preview is for build/review; schema-dependent transactions are rehearsed against isolated data. No Production credential is copied to a new Preview and no real invoice/payment is used for validation.

Rollback: retain LILLY `dpl_9PjLmZjE7wo8XAY6v6KkaKBiCejU` / `2cba906427c365cd4c9078d3f023606d65db8796` and Portal image/container `corazon-portal:renewal-794e647` / `corazon-portal-renewal-794e647`. Do not down-migrate or delete financial evidence. If any new family invoice exists, restore only the Portal entry surface while keeping a family-compatible reconciliation runtime until its financial operations are complete; do not strand those jobs by reverting to an incompatible worker.

Older Portal clients that omit `additionalMembers` retain the original five-argument enrollment and six-argument selection RPC contracts. The new Portal always sends an explicit count, including zero, to opt into the reviewed expansion policy. Existing unpaid/in-flight legacy selections are not silently upgraded merely by calling the old contract.
