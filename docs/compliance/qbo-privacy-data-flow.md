# QBO field inventory and minimum necessary
Reviewed 2026-10-28 against `quickbooks/client.ts`, `automatic-invoice.ts` and `family-invoice-lines.ts`. **LEGAL REVIEW REQUIRED**. Field names only; no real values, provider calls, invoices or payments used. QBO OAuth/webhook/reconciliation/invoice behavior unchanged.

| Sent field / use | Classification | Necessity / exposure assessment |
| --- | --- | --- |
| Customer.DisplayName ← first_name, last_name, contact_id prefix | Identity + operational | Customer display/disambiguation; contact prefix is a reduction candidate, but customer uniqueness/accounting matching effects require regression and owner approval |
| Customer.GivenName / FamilyName | Identity | Direct identifiers for the accounting customer; linked healthcare billing may be PHI |
| Customer.PrimaryEmailAddr.Address | Contact | Customer matching/delivery; same address used in lookup query |
| Query.PrimaryEmailAddr | Contact | Existing-customer matching; avoid printing query values in logs |
| Invoice.CustomerRef.value | Billing / identity linkage | Stable accounting-customer reference needed for billing/reconciliation |
| Invoice.BillEmail.Address | Contact | Hosted billing delivery context, possible PHI |
| Invoice.DocNumber | Operational / billing | Deterministic number derived from enrollment_intent_id hash; used in recovery/matching |
| Invoice.PrivateNote ← enrollment_intent_id | Operational | Internal correlation and uncertain-write recovery; potential reduction needs end-to-end accounting/recovery proof |
| Invoice.EmailStatus | Operational | Provider delivery flag; no diagnosis |
| Invoice.AllowOnlineCreditCardPayment / AllowOnlineACHPayment | Billing configuration | Hosted payment availability, not card/account details |
| Invoice.Line.Amount | Billing | Monetary calculation/reconciliation |
| Invoice.Line.DetailType | Operational | Provider line structure |
| Invoice.Line.Description (Family lines only) | Membership | Family membership, additional-person count/month/proration date context can reveal a health-program relationship; no names of family members constructed in these descriptions |
| Invoice.Line.SalesItemLineDetail.ItemRef.value | Membership / billing | References product selected by plan/membership_type/duration via mapped product name; provider catalog itself may reveal health context even without Description |
| Invoice.Line.SalesItemLineDetail.Qty / UnitPrice | Billing / membership | Family quantities/prices and duration can convey membership composition; required to reconcile current quote |
| Invoice.Line.SalesItemLineDetail.TaxCodeRef.value | Billing | Tax classification |
| Sparse update.sparse / Id / SyncToken / DocNumber | Operational / billing | Provider concurrency and deterministic numbering |
| OAuth.client_id / response_type / scope / state / client_secret / code / redirect_uri / grant_type / refresh_token; revocation.token; Authorization header | Operational / credentials | OAuth only; server-side, never audit payload or browser exposure |
| API company path.realmId; query criteria.PrimaryEmailAddr/Item.Name/Invoice.Id; query.maxresults/include=invoiceLink; customer/invoice/payment path IDs; access token Authorization header | Operational / identity linkage | Provider account and resource targeting; tokens excluded from logs |

No diagnosis, clinical note, allergy, condition, DOB, phone/address or card/ACH account value is constructed in the reviewed customer/invoice creation payloads. Clinical fields in the local `pacientes` table are not selected into these creation builders. This is a source/data-flow conclusion, not an account-wide inspection of manually entered QBO records.

Product names are derived from plan, membership type and duration. Family descriptions expose membership/service and coverage-period context. The absence of diagnosis therefore does not establish non-PHI. Intuit's official QBO guidance advises against identifiable health information and does not establish a suitable HIPAA accounting contract here.

## Removal decision
No unnecessary field was proven safely removable now. The contact prefix, internal intent note and verbose membership/proration descriptors are concrete reduction candidates. Existing customer disambiguation, uncertain-write recovery, product mapping and reconciliation depend on identifiers/line structure; changing them speculatively risks billing. Counsel/accounting must classify the healthcare relationship, approve minimum necessary fields/neutral descriptors and accept a tested replacement. No payload field, description, OAuth behavior or invoice/payment logic was changed.

Source: [Intuit QBO privacy suitability guidance](https://quickbooks.intuit.com/learn-support/en-us/help-article/insurance-medical-benefits/quickbooks-online-hipaa-compliant/L9HSimAH5_US_en_US).
