# HIPAA technical readiness — evidence update
2026-10-28. Overall **PARTIAL**. This is not a HIPAA compliance declaration. Actual Production project `ruedelunbtaomhrzgelc` was inspected read-only; no patient records or secret values were displayed. Release baseline PR193 / `7f311822882650f671ad6a1eea8259d61fffc21c`.

| 45 CFR 164.312 area | Status | Evidence and limit |
| --- | --- | --- |
| Access Control | PARTIAL | 61 Patient/Sales tables RLS enabled and browser grants denied; service-scoped RPCs, patient/organization/role checks, private archive Storage and no Sales/Patient Realtime exposure verified. Legacy attendance definers permit unauthenticated arbitrary-subject calls: protected correction required. Workforce lifecycle, emergency access and periodic review not verified. |
| Audit Controls | PARTIAL | Sales history includes actor/org/action/resource/request/time/changes; write idempotency and dedicated patient/family/invoice events exist. Added sanitized profile/user-update and authorization-denial metadata at application layer. Durable comprehensive privileged-change audit, retention, review and alert ownership not verified. |
| Integrity | PARTIAL | Controlled RPCs, request/idempotency constraints and immutable Agreement acceptance verified. Actual daily backups verified; isolated restore not performed due cost approval rejection. Storage-object backup and organization-wide integrity controls not verified. |
| Person or Entity Authentication | PARTIAL | Provider Auth, user binding and active-staff checks; synthetic unbound/anonymous negative tests deny patient/staff access. Auth rate configuration inspected. Legacy attendance actor binding defect remains until protected fix applied; MFA/lifecycle evidence incomplete. |
| Transmission Security | PARTIAL | HTTPS and PR193 headers preserved across public site, Portal and LILLY. Vendor data-flow/BAA suitability and encrypted endpoint coverage require organizational confirmation. |

## Production evidence scope
All 136 relevant Native Sales/patient routine ACL/search-path entries inspected; 11 key deployed security-function definitions match reviewed source fingerprints. Do not infer all function bodies match from that subset. Production read-only negative checks deny anonymous direct Sales access and legacy patient access; an unbound synthetic Auth UUID gains neither staff/medical access nor records, and service-scoped CRM RPCs reject a missing organization actor. Public schema CREATE denied browser roles. No writes or real patient identifiers used.

Legacy `registrar_entrada(uuid,text)` and `registrar_salida(uuid,text)` are SECURITY DEFINER, have no explicit search_path and allow anon/authenticated EXECUTE without actor binding. No exploit executed. Review proposal and exact rollback are retained in release artifacts; do not apply outside schema_check → approval → schema_apply → approval → schema_verify.

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
| Profile update | New application metadata event, field names only | PARTIAL pending deployment and retention evidence |
| Privileged configuration / roles / permissions | Some controlled RPC history; new user-update metadata event | PARTIAL; durable complete coverage/review not established |
| Authorization failures | New sanitized request-correlated denied event | PARTIAL pending deployment and log operations |

Application logging accepts metadata only, sanitizes identifiers and field names and excludes values, full request bodies, credentials, card data and unnecessary PHI. Existing event tables may contain necessary before/after snapshots: retention and minimum-necessary review remain organizational work.

## Dependencies and remaining blockers
Administrative and physical safeguards require evidence in hipaa-organizational-readiness.md. Covered Entity and Part 2 applicability remain NOT VERIFIED. NPP is complete for legal review with unresolved owner inputs, not adopted/published. No executed BAA evidence found; Resend/Hostinger product limitations and QBO suitability need resolution before regulated use can be called ready. Restore drill, Storage backup, audit retention/review and legacy attendance protected fix remain open. Preview cleanup and this release require final evidence; prepared changes are not represented as deployed.

Sources: [HHS safeguards](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html), [45 CFR 164.312](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-C/section-164.312), [Supabase Auth limits](https://supabase.com/docs/guides/auth/rate-limits).
