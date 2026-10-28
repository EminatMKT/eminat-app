# Vendor and BAA evidence review
Reviewed 2026-10-28. Availability is not execution. No agreements signed, no vendor/account settings changed. PHI classification is conditional on entity status and context; linked identity and healthcare billing can qualify without diagnoses. Searches of connected evidence found no executed in-scope BAA; that is not proof none exists.

| Vendor/service | Information potentially received | PHI/ePHI | BAA potentially required | BAA available | Executed evidence | Action |
| --- | --- | --- | --- | --- | --- | --- |
| Supabase Auth/Postgres/private Storage/backups | Identity, membership, patient/contact records, files, logs and backups | POSSIBLE | LEGAL REVIEW | YES | NOT VERIFIED | Obtain executed agreement and High Compliance configuration/scope evidence. |
| Vercel LILLY/API and runtime logs | Requests, session context, application records and sanitized audit metadata | POSSIBLE | LEGAL REVIEW | YES | NOT VERIFIED | Verify eligible coverage, executed agreement, retention and access. |
| Intuit/QBO | Customer names/email/internal identifiers, membership invoices/payment metadata | POSSIBLE | LEGAL REVIEW | UNKNOWN | NOT VERIFIED | Official QBO guidance warns against identifiable health data; resolve suitability and flow with counsel. |
| Resend email API | Recipient, branded verification/recovery links, membership/invoice email content | POSSIBLE | LEGAL REVIEW | NO | NOT VERIFIED | Vendor states not HIPAA compliant and cannot sign BAA; resolve regulated messaging flow before readiness. |
| Hostinger public hosting and Portal VPS | Static-site request metadata; Portal identity/session/member context and server logs | POSSIBLE | LEGAL REVIEW | UNKNOWN | NOT VERIFIED | Official guidance says service not intended as HIPAA environment; assess Portal hosting, contracts and migration alternatives through separate approved work. |
| Google Workspace/Cloud where used | Business correspondence/documents; precise deployed service scope unverified | POSSIBLE | LEGAL REVIEW | YES for eligible covered services | NOT VERIFIED | Verify actual product, admin acceptance and covered functionality. Workspace BAA does not cover every Google service. |
| Google Fonts | IP/referrer and public-page request metadata | POSSIBLE | LEGAL REVIEW | UNKNOWN for this service | NOT VERIFIED | No medical content in URLs; assess self-hosting and metadata exposure. |
| Google Maps outbound link | User-initiated destination/query and request metadata | POSSIBLE | LEGAL REVIEW | UNKNOWN for this service | NOT VERIFIED | Distinguish outbound link from embedded collection; keep PHI out of URLs. |
| Meta/WhatsApp and Social integration | Generic public contact links; social lead/message data depending on enabled integration | POSSIBLE | LEGAL REVIEW | UNKNOWN | NOT VERIFIED | Establish actual product scope and prohibit regulated health data until reviewed; do not assume advertising or WhatsApp terms provide a BAA. |
| Metricool | Business use/data scope NOT VERIFIED in reviewed deployment | POSSIBLE | LEGAL REVIEW | UNKNOWN | NOT VERIFIED | Confirm use; terms restrict sensitive categories; do not send patient data. |
| emc.health public logo host/operator | Public image request metadata | POSSIBLE | LEGAL REVIEW | UNKNOWN | NOT VERIFIED | Identify operator/log retention and assess cross-site metadata. |
| Logging/monitoring | Observed Vercel, Supabase and Hostinger logs; no additional external monitoring SDK established in scope | POSSIBLE | LEGAL REVIEW | Per providers above | NOT VERIFIED | Verify retention, access, reviews and subprocessor inventory. |
| Backup/storage | Supabase database backups/private bucket; independent Storage-object backup not verified | POSSIBLE | LEGAL REVIEW | Supabase eligible agreement | NOT VERIFIED | Verify contractual coverage and object recovery separately. |

## Official sources
- [Supabase HIPAA](https://supabase.com/docs/guides/security/hipaa-compliance)
- [Vercel HIPAA](https://vercel.com/kb/guide/hipaa-compliance-guide-vercel)
- [Intuit QBO HIPAA guidance](https://quickbooks.intuit.com/learn-support/en-us/help-article/insurance-medical-benefits/quickbooks-online-hipaa-compliant/L9HSimAH5_US_en_US)
- [Resend security and HIPAA statement](https://resend.com/security)
- [Hostinger security guidance](https://www.hostinger.com/support/1583287-what-security-measures-does-hostinger-use/)
- [Hostinger allowed uses](https://www.hostinger.com/support/which-types-of-content-and-websites-are-allowed-at-hostinger/)
- [Workspace HIPAA and covered functionality](https://knowledge.workspace.google.com/admin/compliance/hipaa-compliance-with-google-workspace-and-cloud-identity)
- [Google Cloud HIPAA](https://docs.cloud.google.com/docs/security/compliance/hipaa)
- [Metricool terms](https://metricool.com/legal-terms/)

No legal certification, contractual exception or executed BAA is inferred from product security marketing. QBO remains unchanged. See qbo-privacy-data-flow.md and hipaa-organizational-readiness.md.
