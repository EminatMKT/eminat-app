# HIPAA technical readiness — evidence update
2026-10-28. Overall **PARTIAL**. This is not a HIPAA compliance declaration. Actual Production project `ruedelunbtaomhrzgelc` was inspected read-only; no patient records or secret values were displayed. Application release PR194 / `08747e279e222159118200f62b3c529f3050b716`; protected attendance schema source `4fba236d8a14469178fa62f05039a1cb39986f58`.

| 45 CFR 164.312 area | Status | Evidence and limit |
| --- | --- | --- |
| Access Control | PARTIAL | 61 Patient/Sales tables RLS enabled and browser grants denied; service-scoped RPCs, patient/organization/role checks, private archive Storage and no Sales/Patient Realtime exposure verified. Both legacy attendance definers now deny anonymous execution, bind active authenticated users to their own ID, preserve trusted service_role behavior and set a safe explicit search_path; protected Production check/apply/verify passed. Workforce lifecycle, emergency access and periodic review not verified. |
| Audit Controls | PARTIAL | Sales history includes actor/org/action/resource/request/time/changes; write idempotency and dedicated patient/family/invoice events exist. Added sanitized profile/user-update and authorization-denial metadata at application layer. Durable comprehensive privileged-change audit, retention, review and alert ownership not verified. |
| Integrity | PARTIAL | Controlled RPCs, request/idempotency constraints and immutable Agreement acceptance verified. Actual daily backups verified; isolated restore not performed due cost approval rejection. Current private archive bucket and pointer table each contain zero objects/rows. File strategy is documented; future object backup and organization-wide integrity controls remain unverified. |
| Person or Entity Authentication | PARTIAL | Provider Auth, user binding and active-staff checks; synthetic unbound/anonymous negative tests deny patient/staff access. Auth rate configuration inspected. Legacy attendance actor binding was corrected through the protected Production workflow; MFA/lifecycle evidence incomplete. |
| Transmission Security | PARTIAL | HTTPS and PR193 headers preserved across public site, Portal and LILLY. Vendor data-flow/BAA suitability and encrypted endpoint coverage require organizational confirmation. |

## Production evidence scope
All 136 relevant Native Sales/patient routine ACL/search-path entries inspected; 11 key deployed security-function definitions match reviewed source fingerprints. Do not infer all function bodies match from that subset. Production read-only negative checks deny anonymous direct Sales access and legacy patient access; an unbound synthetic Auth UUID gains neither staff/medical access nor records, and service-scoped CRM RPCs reject a missing organization actor. Public schema CREATE denied browser roles. No writes or real patient identifiers used.

The verified legacy defect in `registrar_entrada(uuid,text)` and `registrar_salida(uuid,text)` was corrected in Production using the unchanged reviewed SQL. Formal sequential Production approvals released schema_check, schema_apply and schema_verify only after predecessor success. Run 40734062681 completed SUCCESS. Anonymous EXECUTE is revoked; authenticated access is active-self bound; service_role behavior is preserved; search_path is explicit public,pg_temp. No patient/personnel records were read or modified. Isolated synthetic authorization tests passed; exact byte-preserving rollback reproduces both original server hashes. Initial run 40718151276 stopped at check because HTML extraction had collapsed formatting; PR195 repaired only the baseline archive/hashes and rollback formatting and added CI coverage, without changing remediation SQL.

## Effective rate evidence
Supabase Auth dashboard: signups/signins 30 per 5 minutes/IP; token verification 30 per 5 minutes/IP; token refresh 150 per 5 minutes/IP. Minimum email interval 60 seconds when custom SMTP applies. No brute-force test. Application registration admission is atomic/database-backed: 3/email/hour, 5/email/day and 20/source-IP/hour with HMAC digests, plus recovery cooldown of two minutes and separate admission namespace. Vercel forwarded-IP header is trusted only on Vercel. Proxy/shared-IP limits require operational monitoring. Unknown/staff/existing email responses retain non-enumerating behavior. Public static website has outbound links, no observed sensitive form submission endpoint.

## Audit event coverage
| Flow | Evidence | Status |
| --- | --- | --- |
| Registration / identity / contact / lead / assignment | Admission digests, patient intent/link events, controlled RPC history | PASS within reviewed flows |
| Opportunities / stages / seller reassignment | Sales history and write operation actor/org/request references | PASS within reviewed flows |
| Agreement | Acceptance record plus immutable acceptance trigger | PASS |
| Invoices / reconciliation / payment verification | Invoice job events, webhook fingerprints and state history | PASS; no real payment tested |
| Activation / renewal / Family / cancellation/void | Membership history, selection/family draft events and controlled transitions | PASS within reviewed flows |
| Profile update | New application metadata event, field names only | PARTIAL; deployed, retention/review evidence pending |
| Privileged configuration / roles / permissions | Some controlled RPC history; new user-update metadata event | PARTIAL; durable complete coverage/review not established |
| Authorization failures | New sanitized request-correlated denied event | PARTIAL; deployed, log operations evidence pending |

Added security-event logging accepts metadata only, sanitizes identifiers and field names and excludes values, full request bodies, credentials, card data and unnecessary PHI. Existing event tables may contain necessary before/after snapshots: retention and minimum-necessary review remain organizational work.

## Dependencies and remaining blockers
Administrative and physical safeguards require evidence in hipaa-organizational-readiness.md. Covered Entity and Part 2 applicability remain NOT VERIFIED. NPP is complete for legal review with unresolved owner inputs, not adopted/published. No executed BAA evidence found; Resend/Hostinger product limitations and QBO suitability need resolution before regulated use can be called ready. Restore drill and audit retention/review remain open; current object inventory is empty and future backup activation requires ownership. PR #194 was merged and deployed as 08747e279e222159118200f62b3c529f3050b716. Production alias, security headers and 22 variable metadata entries were verified. Eighty-three Previews were retired, including the final PR195 dummy fixture; zero remain and defaults are fixture-only. Terms was published as the tested candidate, preserving legal substance. Protected attendance SQL was applied and verified by successful run 40734062681. No application redeployment was needed for the evidence-only PR195; its schema workflow used the exact merged source and the same authorized SQL.

Sources: [HHS safeguards](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html), [45 CFR 164.312](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-C/section-164.312), [Supabase Auth limits](https://supabase.com/docs/guides/auth/rate-limits).

## Remaining-item package and separate safeguard readiness
This follow-up reuses the verified PR192–195 security baseline; it does not repeat or replace the full RLS/isolation audit. Actual metadata confirms no audit triggers on relevant corporate role/module/team/scope tables, pgAudit not enabled, and current Storage object count zero. New private metadata-only append storage and selected administrative-route calls are tested/prepared, but remain pending the new protected schema gate and application release. Their post-commit append and fallback warning do not establish complete atomic audit coverage.

| Dependency | Readiness / evidence |
| --- | --- |
| Administrative safeguards | PARTIAL: technical risk/access work exists; officer appointments, actual training/access-review/offboarding operations, approved IR/breach/sanction policies and evidence remain unresolved. Templates are prepared, not adopted. |
| Physical safeguards | NOT VERIFIED: no EMC-specific completed facility/device-control evidence established in available records. |
| Organizational requirements | PARTIAL: vendor/data-flow reviews and BAA register prepared; executed agreements, scope and accepted responsibilities not verified. |
| BAA / vendor suitability | NOT VERIFIED for execution. Supabase/Vercel/covered Google functionality offer eligible BAAs; Resend has no BAA, Hostinger disclaims PHI hosting suitability, QBO advises against identifiable health information. Current email/billing context may be PHI; legal/vendor decisions are blockers. |
| NPP | Draft/checklist complete for legal review; adoption, effective date, contact, distribution/acknowledgment evidence NOT VERIFIED; no notice published. Part 2 conditional pending determination. |
| Contingency and recovery | PARTIAL: daily/seven-day database backups verified, procedure and 24h RPO/8h RTO proposals documented. Restore drill NOT VERIFIED because paid isolated infrastructure is excluded. No paid resource created. PITR disabled; proposed objectives not approved or demonstrated. |

All five 164.312 areas remain **PARTIAL**, with legal/administrative/physical/contractual dependencies shown separately. The conditional Supabase High Compliance requirement for PITR is a vendor-suitability decision, not automatically satisfied by approving a longer RPO. A drafted policy, empty bucket, local schema test or available BAA is not proof of operational compliance.
