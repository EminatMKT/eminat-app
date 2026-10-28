# QBO field-level privacy review
Reviewed source only, 2026-10-28. No real patient values inspected. QBO configuration, payloads, OAuth, reconciliation, payment and business behavior unchanged.

Source: `src/server/sales-native/quickbooks/client.ts` and invoice description builders.

| Transmission | Field names/content categories | Purpose and classification |
| --- | --- | --- |
| Customer creation | DisplayName (first_name, last_name, contact_id prefix); GivenName; FamilyName; PrimaryEmailAddr.Address | Customer identification/delivery; direct identifiers and internal identifier. POSSIBLE PHI in care/payment context. |
| Customer search | PrimaryEmailAddr email query | Duplicate/customer matching; direct identifier. |
| Invoice | CustomerRef.value; BillEmail.Address; DocNumber; PrivateNote containing enrollment_intent_id; EmailStatus | Billing identity, delivery, reconciliation and internal correlation. POSSIBLE PHI. |
| Invoice lines | Amount; DetailType; Description (membership/family and proration/expiry/month context); ItemRef; Qty; UnitPrice; TaxCodeRef | Billing itemization; can reveal healthcare membership/payment relationship. POSSIBLE PHI. |
| Payment settings | AllowOnlineCreditCardPayment; AllowOnlineACHPayment | Hosted payment availability; configuration, not card data. |
| Sparse update | Id; SyncToken; DocNumber | Invoice concurrency and number alignment. |
| OAuth/webhooks/reconciliation | realm/account identifiers, OAuth credentials server-side; invoice IDs/status/balance/payment metadata | Account authorization and reconciliation; secrets must remain server-side, invoice metadata can be PHI. |

Reviewed creation payloads do not transmit diagnosis, DOB, clinical notes, telephone, address or card/ACH details. Customer/invoice names, email and service context may nevertheless constitute PHI when a regulated relationship applies. Hosted payment URLs are restricted to the authenticated patient's own intent and the allowed Intuit host.

Minimum necessary: **LEGAL REVIEW**, not established merely because fields serve billing. Names, email, accounting customer references and monetary line items have documented operational purposes. Internal contact prefix, intent UUID in PrivateNote, and detailed membership/proration descriptions merit reduction review; necessity/avoidability is not established without accounting and legal acceptance of replacement identifiers/descriptions. No fields were removed speculatively.

Intuit states QuickBooks Online does not meet HIPAA privacy standards and advises against individually identifiable health information. If this flow is regulated PHI, counsel must resolve product suitability and permissible data flow before declaring readiness; a generic security claim or payment-processing exception does not settle the full customer/invoice flow.

Source: [Intuit official guidance](https://quickbooks.intuit.com/learn-support/en-us/help-article/insurance-medical-benefits/quickbooks-online-hipaa-compliant/L9HSimAH5_US_en_US).
