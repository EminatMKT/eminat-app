# Complimentary memberships — implementation assessment

Assessment date: 2026-11-23. Delivery baseline LILLY: origin/main 4fcd1c82; Portal: c265310.

## Observed integration boundaries

LILLY is Next.js 14, Supabase/Postgres, Native Sales. `sales_memberships` owns coverage,
`sales_contacts` owns members, `sales_patient_identities` explicitly binds verified Auth
users to contacts. Staff must have an active corporate profile and active Sales organization
membership. Portal is a separate Next.js application. Its LILLY adapter forwards an opaque
Patient session from a secure host cookie; it does not directly access the database.
The applications currently share the LILLY Auth project through that API, not staff sessions.
No additional database or synchronization service is needed.

The existing `membership_type` means INDIVIDUAL/FAMILY, so retain it. Add `funding_type`
(PAID/COMPLIMENTARY), and an authorization record linked to the existing coverage row.
Keep existing dates, household, code registry and member identity. Never pass a courtesy
through paid issuance, enrollment, QBO verification, invoice jobs or payment records.
The existing active-membership payment constraint and QBO activation trigger require a
narrow exception for a linked approved benefit. Paid branches retain their original checks.

## Migration/API design (before implementation)

Add organization benefit settings, authorizations, hashed individually traceable codes,
append-only events and persistent authenticated redemption admission. Standard terms are
3/6/12 calendar months; custom terms require SUPERADMIN. Authorizations are approved by
the authorizing administrator; no separate two-person approval policy is inferred.
An optional beneficiary contact is an exact tenant-scoped binding. Campaign labels do not
create shared codes. Existing contact creation and reviewed identity linking remain in use.
Activation locks both authorization and contact, checks pending paid obligations and existing
coverage, and atomically creates membership/period/household and consumes the code.
No public code inventory or raw codes in storage/audit. Raw code is returned only once.

CRM `/api/sales-native/complimentary`: server-resolved ADMINISTRATOR/SUPERADMIN only.
Patient `/api/patient/v1/complimentary`: authenticated preview and atomic redemption;
plan/duration/approval always come from the database, never the Patient request.
Use existing registration/login/profile APIs first, then redeem. Existing CRM contacts without
an explicit identity binding require the existing reviewed linking process.

Calendar dates use a stored IANA timezone (default America/New_York, reflecting the US
membership service; confirm per organization before release). Activation is timestamped;
expiry is the calendar anniversary's local midnight, exclusive. Expiry is enforced when
reading coverage; scheduled reconciliation is housekeeping, not the access boundary.

## Billing compatibility and release gates

Zero-value coverage is a documented waiver, not a payment or paid invoice. It must never
enter automatic paid renewal/family-addition jobs. Explicit future paid enrollment requires
the existing checkout, agreement and payment authorization. Existing paid price catalog,
payment verification and authentication are unchanged.

Use local isolated PostgreSQL and synthetic fixtures. Repository instructions prohibit
agent-applied production migrations or direct deployments; deliver migration/precheck/check/
rollback for reviewed release. No staging tier is documented in LILLY; the user has been
asked for the staging target. A Preview sharing production data does not qualify as staging.

## Backup and rollback plan

Before an approved release, record the exact application SHAs, migration baseline, provider
snapshot identifier, restore point and successful restore rehearsal in an isolated database.
Preserve a database backup containing authorizations, code digests and audit records. Never
export plaintext code inventories. Disable the feature before application rollback. An unused
migration may be reversed by the supplied guarded rollback. Once benefit history exists,
retain the schema/history and roll back the application; use a separately reviewed forward
repair. Never delete activated benefits or restore paid-only constraints over courtesy rows.

## Evidence

Implementation and verification results are recorded separately after execution. This initial
assessment does not certify current production schema, deployed behavior, staging or backups.
