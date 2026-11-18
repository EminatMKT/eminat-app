# EMC Meta Lead Ads

## Boundary and existing implementation

LILLY Native Sales is the commercial source of truth. Metricool remains independent. No DM, comment, clinical, insurance, DOB, ZIP or free-text inquiry data is ingested. No medical or Portal table/function, Auth policy, seller entitlement, payment, Family or agreement behavior is changed.

The existing Meta HMAC/challenge route, encrypted OAuth handoff, Social assets, leased receipt queue, external-ID mappings and Native Sales lead/activity tables are reused. The former generic receiver accepted messages/comments/arbitrary answers and a fixed owner. This release replaces that admission behavior with Lead Ads only, mandatory Graph reread and a server-owned EMC allowlist.

## Approved source policy

- EMC organization: `9efab353-46a0-43d1-9901-e3f185dc5d30`.
- Meta app: `919434760646769` (CRM Social Media Integration).
- App portfolio: `1865633431087642` (Stratix Communications).
- Page: `405695562628937` (EMC), owned by EMINAT MEDICAL CENTER and accessible under the Stratix app portfolio. Graph Page ownership is distinct from the app portfolio; do not infer ownership from the portfolio selector.
- Contact-only form: `612660371798285`; reviewed full name, email and phone.
- Excluded forms needing correction: `1382279963288694`, `3854753151408361`.
- Historical Page advertising points to account `264066244767611`, “Eminat Researsh Group”, in portfolio context `155536742632373`. This shared account is not connected or granted broader access by this release. Ad Account access is not a substitute for the exact Page/form allowlist.

The TypeScript policy and SQL admission guard must agree; the SQL integration rehearsal uses the reviewed identifiers with synthetic local data. A client cannot supply an organization. Unknown Page/form pairs are dropped before persistence/API retrieval. The SQL boundary additionally checks the connected app, portfolio and tenant.

## Processing and privacy

The signed webhook retains IDs and event time only, never supplied `field_data`. Graph reread verifies the lead ID and form ID. Optional attribution denial falls back to a bounded minimal-fields read; absent platform is labelled Meta rather than guessing Facebook. A release precheck refuses unrelated active Meta connections. A bounded server-side sanitizer admits name, email, phone, constrained language and numeric campaign/ad/adset IDs. Inquiry and activity text are fixed generic strings. Unknown answers are discarded; only a boolean field-blocking flag is audited. Processed/failed receipts do not retain answers. Tokens remain encrypted server-side and errors are fixed codes.

A 1 MiB request cap, 100-event cap, 120 new receipts/minute per Page, bounded Graph responses/timeouts, three inline recovery jobs and leased retry processing limit resource use. A dedicated gated GitHub Actions tick invokes the same recovery endpoint every five minutes using the existing CRON_SECRET binding; Vercel’s daily cron remains an idempotent backstop. No hosting-plan or unrelated scheduler changes. HMAC is checked before database work. Existing receipt hashes and external IDs prevent replay and duplicate tasks.

Reconciliation uses exact normalized email/phone and existing Contact lineage, never fuzzy matching; conflicting identities stop for supervisor review. Existing records keep ownership and data. Newly acquired identities use the existing EMC assignment order, eligibility predicates, shared locked cursor and team, with no second assignment state/order. No eligible seller uses the existing administrative holding owner and a supervisor-visible unassigned task. Follow-up uses the existing configured registration follow-up interval and Sales Activities idempotency key.

## Validation and release

- Unit/security suite, TypeScript and synthetic SQL rehearsal are required. Local rollback rehearsal restored the three original RPC definitions/ACL and preserved every synthetic lead/activity/receipt/mapping/history count.
- Full migration-chain and browser Sales/security regressions remain mandatory CI gates.
- Preview protection stays enabled; Preview receives only isolated/synthetic configuration.
- Do not grant messaging/comment scopes or import Metricool messages.
- Meta app publication/business verification and supported Lead Ads permissions must be checked before claiming live delivery. A successful synthetic local test does not prove live Meta connectivity.
- Apply `20261029170000_native_sales_meta_lead_ads.sql` only through the existing guarded Native Sales workflow, with exact commit/digest, fresh restorable backup and Production approval. No manual SQL editor writes.
- Run a controlled synthetic Meta lead, duplicate/retry checks and Sales UI smoke before calling the integration operational. No real patient data/payment.

## Rollback

First disable the EMC Page asset/OAuth activation, preserving acquired leads and audit. Restore the prior exact Vercel deployment. The reviewed protected rollback script restores previous Social RPC definitions and removes only the new external-ID index; it does not delete business rows. Never reactivate the old broad receiver while the Page is subscribed. Keep the new field/DM filter in place during a partial rollback.

Provider field reference: [Meta Business SDK Lead object](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/lead.py).
