# Billing v2 — corrected working design

Date: 2026-09-23
Status: user corrections incorporated; complete design and implementation plan still pending review.

## Purpose and document location

Replace the existing collections experience with the payment calendar inspired by:
<https://eminatcollections.my.canva.site/calendario-din-mico-de-pagos>.

This document is inside the eminat-app project at `docs/superpowers/specs/2026-09-23-billing-v2-working-notes.md`. It is a working design document, not a completed Superpowers specification or implementation plan.

## Confirmed decisions

| Topic | User-selected direction |
|---|---|
| Public route | `/billing`, replacing `/cobranzas` |
| Old URL | Remove `/cobranzas`; direct visits return 404, with no redirect or compatibility alias |
| Navigation | Update menu buttons and application links to `/billing` |
| Internal permission key | Keep `cobranzas` for now, preserving existing grants |
| New feature | `src/features/billing-v2` |
| Legacy feature | Rename `src/features/cobranzas` to `src/features/billing-v1`; retain it for now |
| Shared data modules | New `billing_v2.ts`; rename legacy `cobranzas.ts` to `billing_v1.ts` |
| New table | `billing_v2_records` |
| Legacy data | Keep it in place for now; no automatic migration planned |
| Categories | Fixed values in the billing domain, not administrable initially |
| Payment workflow | Manual statuses initially; improve the lifecycle later |
| Initial reminders | Simple in-app reminders visible when opening billing |
| Email notifications | Desirable enhancement for later/final phases, not a launch requirement |

These decisions supersede earlier naming proposals and the previously proposed redirect. Users normally navigate through menu buttons; backward compatibility for direct visits to the old URL is not required. This document describes intended changes, not completed application or production changes.

## Canva prototype: observed behavior

### Calendar

- Monthly calendar with previous month, today, and next month navigation.
- Add-record action and category/status filters.
- Record chips in calendar cells.
- Side panel with upcoming payments and the monthly note.

### Summary

- General metrics and distribution by status.
- Paid and pending payment summaries.

### Data

- Searchable records table.
- Filters by type, category, and status.
- CSV copy/export actions.

Observed record types: `Pago`, `Evento`, and `Nota del mes`.

Observed statuses: `Pagado`, `Pendiente`, `Programado`, and `Aprobación pendiente`.

Initial fixed domain categories: `Payroll` and `Contractors & Vendors`.

Observed fields include record ID, type, date, time, category, status, vendor or contractor, concept or title, amount, note, closing/approval reminder, month note, and update timestamp.

## Existing implementation baseline

The current application, before implementation of this design, uses `/cobranzas`.

Relevant existing files:

- `src/app/(app)/cobranzas/page.tsx`
- `src/features/cobranzas/`
- `src/features/cobranzas/hooks/useCobranzasData.ts`
- `src/shared/data/cobranzas.ts`
- `src/shared/data/tables.ts`

Existing tables: `cobranzas_ventas`, `cobranzas_cuentas`, and `cobranzas_depositos`.

The current UI has `ventas`, `cuentas`, and `depositos` tabs. The existing data hook combines loading, filtering, calculations, imports, exports, printing, and manual creation. The feature is relatively isolated behind its page and feature folder.

## Production inspection snapshot

The prior inspection used aggregate-only, read-only queries; detailed row data was not inspected. These are findings from that inspection, not continuously refreshed counts.

| Table | Rows | First timestamp | Last update |
|---|---:|---|---|
| `cobranzas_ventas` | 23 | 2026-04-08 | 2026-04-08 |
| `cobranzas_cuentas` | 0 | — | — |
| `cobranzas_depositos` | 0 | — | — |

For `cobranzas_ventas`:

- One distinct month: `FEBRERO`.
- Two periods, seven laboratories, and fourteen studies.
- Total amount: `110605.48`.

The related public tables found were only the three `cobranzas_*` tables above. No related billing, payment, pagos, or deprecated replacement tables were found during that inspection.

Retain these tables and their data. Working interpretation of keeping the old material in place: do not automatically import these rows into v2 or add a legacy report to the first release. Revisit only if historical data must appear in the new UI.

## Routing and permissions — confirmed

- `/billing` is the public route and renders billing v2.
- Remove the old `/cobranzas` route; direct visits return the application's normal 404 response. Do not add a redirect or compatibility alias.
- Update navigation menu buttons and other application links to `/billing`.
- Retaining billing v1 source does not expose a public legacy route.
- Keep existing authentication and authorization for `/billing`.

Existing authorization baseline:

- `MODULE.COBRANZAS = 'cobranzas'`.
- `role_modules` assigns the `cobranzas` module slug to the `finanzas` role.
- No grants were found for `billing`, `billing_v2`, or `cobranzas_deprecated`.

The user approved retaining the internal `cobranzas` permission value for now. Preserve existing grants and access behavior; do not migrate production role grants solely to match the URL or source-code names. The permission key and old-URL behavior are resolved decisions, not open questions.

## Low-cost replacement approach

1. Retain legacy code as `src/features/billing-v1`, updating affected imports when moved.
2. Rename legacy shared data access to `src/shared/data/billing_v1.ts`.
3. Build the replacement in `src/features/billing-v2`, using `src/shared/data/billing_v2.ts`.
4. Store new records in `billing_v2_records`; leave legacy tables unchanged.
5. Serve the new feature from `src/app/(app)/billing/page.tsx`, remove the old route, and update navigation references.
6. Keep legacy code out of the new page's imports rather than commenting out its source.
7. Preserve the existing internal permission key and authorization grants.

Benefits:

- Keeps legacy history without forcing report-shaped data into calendar-shaped records.
- Separates the replacement from the old data hook and UI.
- Avoids unnecessary data migration, URL compatibility code, and an approval workflow in the initial release.
- Retains legacy code for a possible page-level rollback; any rollback must also check routing and authorization.

Costs:

- Retained legacy code still requires valid imports and may remain part of type checking.
- Historical data remains separate from the new UI.
- Renaming the feature and route requires more than changing a single page import.

Rejected alternatives: commenting out the old feature, reusing its folder for the replacement, keeping `/cobranzas` as a public route, or redirecting it to `/billing`.

## Cross-layer version naming — confirmed

Use the billing v1/v2 distinction consistently across the affected module. Baseline references above describe existing code, not target names.

| Layer | Legacy target | Replacement target |
|---|---|---|
| Feature directory | `src/features/billing-v1/` | `src/features/billing-v2/` |
| Shared data module | `src/shared/data/billing_v1.ts` | `src/shared/data/billing_v2.ts` |
| Symbol prefix, when version distinction is needed | `BillingV1` / `billingV1` | `BillingV2` / `billingV2` |
| Persistence | Existing legacy tables retained | `billing_v2_records` |

- Update imports, re-exports, aliases, mocks, and tests affected by renames.
- Apply versioned billing names to related components, hooks, types, data-access functions, and constants where they identify the implementation. Keep idiomatic casing rather than mechanically inserting underscores into TypeScript identifiers.
- Follow the distinction in documentation and test descriptions; do not rename unrelated modules.
- Keep `/billing` unversioned; no public `/billing-v1` route is needed.
- Do not rename persisted `cobranzas_*` tables or the retained `cobranzas` permission value merely to align source names.

## Domain and payment lifecycle

Define categories once in the billing domain and reuse them in forms, filters, and validation. Initially use `Payroll` and `Contractors & Vendors`; no category-management interface.

Use manually selected payment statuses initially. `Aprobación pendiente` is a status label, not an approval engine. No automatic transitions, multi-step approvals, or payment execution are implied. A richer lifecycle can be designed in later phases.

## Notifications and delivery phases

### Initial release — confirmed

Use simple in-app reminders visible when opening billing. They do not send email or notify users while the application is closed. No background delivery service is required initially.

The exact due-date window, timezone handling, record eligibility, and suppression of paid records still need specification. Recommended behavior is to highlight upcoming/overdue unpaid payments without generating duplicate persistent notifications.

### Later/final phases — desirable, optional

Email reminders are a desirable enhancement, not a launch prerequisite. Design recipients, scheduling, delivery configuration, retries, and duplicate prevention when prioritized.

Do not build email delivery or an approval engine merely to prepare for a possible future requirement.

## Preliminary new table model

Confirmed name: `billing_v2_records`.

Candidate fields, not yet finalized database DDL:

- `id uuid primary key`
- `record_type text not null`
- `date date not null`
- `time time null`
- `category text null`
- `status text null`
- `person_or_vendor text null`
- `concept text null`
- `amount numeric(12,2) null`
- `has_amount boolean not null default false`
- `event_type text null`
- `note text null`
- `cutoff_reminder boolean not null default false`
- `month_note text null`
- `created_by uuid null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Remaining schema decisions:

- Representation and validation of record types and statuses.
- Whether status is required only for payments.
- Database validation matching fixed domain categories.
- Monthly-note representation and uniqueness rules.
- Amount validation and whether `has_amount` is needed or derivable.
- Ownership, access policies, and timestamp-update behavior.

## Verification requirements for routing

- Navigation opens `/billing` for an authorized user.
- An authenticated, authorized user requesting `/cobranzas` directly receives 404, not a redirect or legacy screen.
- `/billing` retains existing access restrictions using the `cobranzas` permission key.
- No application navigation link continues to target the removed route.

## Remaining review items

1. Define the simple in-app reminder rules.
2. Finalize schema constraints, access policies, validation, and test coverage.
3. Review and approve the complete design before creating the implementation plan.

Route, old-URL 404 behavior, permission key, versioned naming, table name, fixed categories, manual statuses, and notification phases are resolved. Code changes will be performed during implementation after design approval.
