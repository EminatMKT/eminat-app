# Corazón Salud HIPAA technical readiness

Status: **PARTIAL — no overall HIPAA compliance claim**. This targeted remediation is based on main 1804a72d, preserving PR #192. Local tests and release artifacts must not be reported as Production controls until the exact release and live behavior are verified.

## Technical and organizational controls

| 45 CFR 164.312 standard | Technical evidence | Classification | Organizational/legal dependency |
| --- | --- | --- | --- |
| Access Control | Verified-user Sales actor resolution; organization/member/role scoped RPCs; patient session and document scope checks; negative test coverage | PARTIAL | Live grants/RLS and complete synthetic-role checks; emergency access procedure; workforce authorization review |
| Audit Controls | Existing SQL event tables and restricted grants, actor/resource/time metadata across Sales and Patient workflows | PARTIAL | Effective schema, complete event coverage, review cadence, log integrity and retention not verified |
| Integrity | Existing RPC constraints/idempotency; authenticated QBO webhook and token encryption; bounded patient JSON input | PARTIAL | Deployed configuration, change-control evidence, recovery and record-integrity procedures |
| Person or Entity Authentication | Existing Supabase server verification and opaque patient sessions retained; recovery-token single-use control in source | PARTIAL | Live Auth configuration, operational access review, approved staff-as-patient identity workflow validation |
| Transmission Security | HTTPS observed; explicit CSP/header hardening prepared; secrets stay server-side in tested paths | PARTIAL | All service/email paths, provider agreements and configuration evidence |

Sources: [45 CFR 164.312](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-C/section-164.312) and [HHS Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html). Administrative (164.308), physical (164.310), organizational (164.314) and policies/documentation (164.316) controls remain separate evidence requirements. Addressable specifications require a documented assessment; they are not automatically optional.

## Safe changes in this branch

- Remove obsolete ANNIE and disconnected-QBO claims from the website/portal Privacy policy, retaining its purpose and existing contact/request text.
- Explicit public script hashes and resource origins; preserve homepage design/prices and existing HTTPS redirects.
- Portal and LILLY CSP, denied external framing, nosniff, Referrer-Policy, Permissions-Policy and existing HSTS duration.
- Sensitive API/HTML cache controls without disabling immutable public asset caching.
- Enforce the existing Patient JSON size allowance against actual streamed bytes, including absent/false Content-Length.
- Preserve Agreement v5, verified Auth, sales authorization, staff/patient rules, family/renewal/pricing, QBO and PR #192 application code.

## Evidence limits and release gates

The review records before/after public headers, local production-mode browser/CSP checks, unit/integration coverage, builds, CI and protected Preview status in the release validation file. Production schema/catalog, RLS/grants/SECURITY DEFINER search_path, backups/PITR, signed BAAs and live audit coverage require independent read-only evidence. Source migrations are not proof that they were applied.

No new Preview may contain Production service/database/QBO/email credentials. Header-only Preview uses dummy/local configuration. Existing project/deployment secret metadata must be checked without exposing values. Do not delete unrelated Preview artifacts or rotate credentials speculatively.

Backup configuration and PITR: **NOT VERIFIED**. Exact restore procedure execution: **NOT VERIFIED**. Existing guarded migration workflow checks backup evidence and preserves rollback SQL, but that does not prove an actual recoverable backup or restore test. Do not invent RPO/RTO or change backups. Recovery ownership requires organization confirmation.

NPP, covered-entity and Part 2 applicability, approved contact/effective date, policies/training, physical safeguards, vendor contracts and incident response remain organizational/legal blockers to full readiness. They do not prohibit safe tested header hardening.
