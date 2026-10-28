# Corazón Salud vendor BAA review

No agreement is signed or accepted by this change. Provider capabilities are not evidence of an executed customer BAA. Classification is conditional on the actual data flow and regulated role; PII linked to care or payment may be PHI even without diagnoses. No real patient values were reviewed or transmitted for testing.

| Vendor | Current use | PHI/ePHI exposure | BAA required | BAA evidence found | Action required |
| --- | --- | --- | --- | --- | --- |
| Supabase | Auth and PostgreSQL platform used by Portal/LILLY | POSSIBLE | LEGAL REVIEW; YES if acting as BA for ePHI | NOT VERIFIED | Obtain signed BAA, add-on and High Compliance configuration evidence; inspect actual project controls |
| Vercel | LILLY application/API hosting | POSSIBLE | LEGAL REVIEW; YES if handling ePHI as BA | NOT VERIFIED | Obtain executed coverage and project/service scope, review subprocessing and access |
| Intuit/QuickBooks Online | Connected Production invoicing/payment workflow, per current owner brief | POSSIBLE | LEGAL REVIEW | NOT VERIFIED | Map customer and invoice fields; obtain counsel's determination on admissible data/use and any applicable contractual exception; do not assume a BAA or suitability for PHI |
| Resend | Patient verification/recovery/membership/invoice messages in application code | POSSIBLE | LEGAL REVIEW | NOT VERIFIED | Confirm service agreement/BAA availability and minimize message contents/subjects and retention |
| Hostinger/public CDN | Static website and access logs | POSSIBLE | LEGAL REVIEW based on actual flow | NOT VERIFIED | Verify logs, data recipients and whether any PHI reaches hosting |
| Portal VPS/operator | Patient Portal hosting; nginx observed | POSSIBLE | LEGAL REVIEW; YES if BA handling ePHI | NOT VERIFIED | Identify contracting entity and infrastructure scope; obtain executed coverage |
| Google Fonts | Public fonts loaded on homepage/legal pages | POSSIBLE; IP/referrer metadata | LEGAL REVIEW | NOT VERIFIED | Review metadata and referrer exposure; evaluate self-hosting separately |
| Google Maps | Outbound map links, not observed embedded map | POSSIBLE if user transmits sensitive context | LEGAL REVIEW | NOT VERIFIED | Keep PHI out of query strings; distinguish link from embedded collection |
| Meta/WhatsApp | Public generic outbound WhatsApp links; separate Native Sales social integration | POSSIBLE | LEGAL REVIEW | NOT VERIFIED | Map messages/leads and product-specific terms; do not send PHI through advertising tools |
| Metricool | Not observed in reviewed public HTML; business use not established | POSSIBLE | LEGAL REVIEW | NOT VERIFIED | Confirm whether used and whether any identifiable patient context flows there |
| emc.health | Remote public logo image | POSSIBLE; request metadata | LEGAL REVIEW | NOT VERIFIED | Confirm logging/operator and data flow |
| Storage, monitoring, logs and backups | Supabase and hosting capabilities; complete external inventory pending | POSSIBLE | LEGAL REVIEW | NOT VERIFIED | Confirm actual vendors/subprocessors, retention, access and signed coverage |

## Official references

- [HHS cloud computing](https://www.hhs.gov/hipaa/for-professionals/special-topics/health-information-technology/cloud-computing/index.html)
- [Supabase HIPAA guide](https://supabase.com/docs/guides/security/hipaa-compliance)
- [Vercel HIPAA guide](https://vercel.com/kb/guide/hipaa-compliance-guide-vercel)
- [Intuit: Is QuickBooks Online HIPAA compliant?](https://quickbooks.intuit.com/learn-support/en-us/help-article/insurance-medical-benefits/quickbooks-online-hipaa-compliant/L9HSimAH5_US_en_US)
- [HHS tracking guidance and partial vacatur](https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/hipaa-online-tracking/index.html)

Contract decisions and any resulting business/data-flow changes require owner/legal approval; QBO behavior is unchanged here.
