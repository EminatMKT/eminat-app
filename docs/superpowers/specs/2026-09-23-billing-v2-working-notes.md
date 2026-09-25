# Billing v2 — corrected working design

Date: 2026-09-23
Status: user corrections and adversarial database review incorporated; final contract and implementation plan still pending approval.

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

Upcoming/Overdue unpaid grouping and paid-record suppression are confirmed below. The exact window, timezone and optional follow-up-marker behavior remain open. Derive these lists without duplicate persistent notifications.

### Later/final phases — desirable, optional

Email reminders are a desirable enhancement, not a launch prerequisite. Design recipients, scheduling, delivery configuration, retries, and duplicate prevention when prioritized.

Do not build email delivery or an approval engine merely to prepare for a possible future requirement.

## Reviewed new-table proposal — not approved DDL

Confirmed table name: `billing_v2_records`. The original provisional field list is superseded by [the reviewed database proposal](2026-09-23-billing-v2-database-proposal.md); do not implement its old `has_amount`, mixed date/month or ambiguous note fields.

The user is not yet sure whether payroll records are individual or aggregated and requested the simplest workable approach until improvements are discussed. Recommendation: a manual recipient label, without a mandatory CRM-person FK, payroll breakdown or supplier master. A CRM person can exist without login, so lack of login is not the reason to defer linkage; unresolved record granularity is.

The revised candidate uses `payee_label`, `note_text`, `event_type_label` and `closing_approval_follow_up` to describe the actual information. All are manual facts, not derived projections. Creator/timestamps are attribution metadata. Do not persist `has_amount`, totals, reminder groups, formatted amounts or duplicate display names.

Currency was nullable only for nonpayments; the payment shape required USD. Global USD with no currency column is the simpler alternative if confirmed; explicit `currency_code` remains in the review sketch until the choice is made. Do not silently approve either currency scope or exact amount rules.

Both independent Astra Ultra reviewers completed a static evidence-based review. The proposal corrects coercion-before-validation and whitespace-only text checks, and records access/deletion gates: module-wide payroll visibility, editing/deleting paid rows, deactivation with a valid JWT, and the effect of creator retention on existing user-deletion guidance. No SQL was executed.

## Verification requirements for routing

- Navigation opens `/billing` for an authorized user.
- An authenticated, authorized user requesting `/cobranzas` directly receives 404, not a redirect or legacy screen.
- `/billing` retains existing access restrictions using the `cobranzas` permission key.
- No application navigation link continues to target the removed route.

## Remaining review items

1. Finalize the remaining reminder window, timezone and follow-up-marker behavior.
2. Finalize schema constraints, access policies, validation, and test coverage.
3. Approve the final contract and update the existing implementation plan before executing schema-dependent work.

Route, old-URL 404 behavior, permission key, versioned naming, table name, fixed categories, manual statuses, and notification phases are resolved. Code changes will be performed during implementation after design approval.

## Canva fidelity — confirmed brainstorming decision

Use Canva as a functional reference and correct inconsistencies rather than reproduce its behavior exactly. Preserve the intended experience, but discuss concrete behavior changes individually before treating them as approved requirements. This decision does not approve every prototype feature for the initial release or finalize the candidate SQL schema.

Read-only inspection of the published application code found:

- Records are read and written through `dataSdk`; its loading error refers to a linked Canva Sheet. This exposes an application record contract, not a physical database schema, constraints, or access policies.
- Monthly notes use `YYYY-MM` in `date`, whereas payments/events use a full date. The candidate SQL date field needs an explicit mapping or revised model.
- The upcoming-payments list sorts all dated payments and takes six, including past and paid records.
- Summary totals use all loaded payments rather than the selected calendar month.
- The reminder flag is saved and exported; no notification scheduler was found in the inspected application code.

The initial ambiguity about upcoming/reminder membership was resolved by the confirmed grouping decision below. The time window remains undecided.

## Reminder grouping and planning handoff — confirmed

The user approved this correction to Canva's upcoming list:

- Upcoming: unpaid payments whose due date is today or later.
- Overdue: unpaid payments whose due date is before today.
- Paid payments remain visible in Calendar/Data but are excluded from both reminder groups.

This supersedes the earlier statement that grouping and paid-record suppression were undecided. The upcoming date window, timezone, and treatment of optional reminder flags remain separate decisions.

The user requested committing the spec and moving to implementation planning. This authorizes a plan, not application implementation, production changes, or silent approval of previously audited assumptions. The plan must include a decision checkpoint before schema-dependent tasks for the final record model, access rules, currency, monthly-note behavior, and prototype feature scope.

## Reuse and shared promotion — confirmed

Before introducing a new component, hook, utility, or data helper, inspect existing shared code and other features. Reuse a compatible shared piece first. If a suitable piece belongs to another feature, consider promoting its domain-neutral part to shared, update its original consumer, and preserve that consumer's behavior with tests. Billing must not depend on another feature's private internals.

Promotion is selective, not a broad cleanup: keep billing-specific business rules in billing, and do not generalize two unrelated pieces merely because they look alike. Existing shared filters, chart cards, dialogs, date helpers, i18n, and data infrastructure are concrete reuse candidates for the implementation plan.

## Reusable information views — confirmed architecture

Calendar, Kanban and Table are reusable ways to present information, not billing-owned business components. Put their domain-neutral presentation in shared and have feature adapters supply records, labels, rendering, permitted actions and callbacks. Calendar/Table built for billing must follow this boundary even if billing is their first consumer.

Do not move feature data access, authorization, status transitions or record schemas into shared presentation. Existing Tasks Kanban currently mixes its view with TasksContext and task mutations: reuse or promote the neutral rendering, not the entire business hook. Existing table implementations in legacy billing, accounting and Tasks are extraction candidates.

This architecture does not automatically add a Kanban tab to billing. Avoid a single universal view engine with billing/task-specific flags; separate small reusable views with typed adapters are sufficient.

## Concrete database proposal — adversarially reviewed, not approved

See `2026-09-23-billing-v2-database-proposal.md` for the recommended table, field contract, SQL review sketch, indexes, creator/timestamp rules, access matrix, alternatives and test cases. It replaces the earlier preliminary field list as the proposal under discussion; it does not make the proposed schema approved.

The proposal recommends one mixed `billing_v2_records` table, separate typed day/month fields, nullable exact-cent amount instead of has_amount, a manual recipient label for now, and creator attribution to usuarios.id. Its source-data inventory and Canva mapping explain every field. Global versus stored USD, module-wide CRUD, monthly-note uniqueness, inactive-user access, immutable record type and creator-deletion behavior remain explicit approval gates. Existing legacy tables and role grants remain unchanged.
