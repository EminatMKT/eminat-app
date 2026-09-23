# Billing v2 / Collections — working notes

Date: 2026-09-23
Status: correction draft, not an approved specification.

## Purpose

Keep the current findings in one place before turning the billing/collections replacement into a final design or implementation plan.

The requested direction is to replace the current collections module with an experience inspired by the Canva prototype:

- Reference URL: <https://eminatcollections.my.canva.site/calendario-din-mico-de-pagos>
- Concept: dynamic payment calendar for accounting, payments, events, and monthly follow-up.

## Canva prototype: observed behavior

The prototype is a calendar app with three main views.

### Calendar

- Monthly calendar view.
- Month navigation: previous month, today, next month.
- Primary action: add record.
- Filters by category and status.
- Calendar cells show record chips.
- Side panel shows upcoming payments and the monthly note.

### Summary

- General metrics.
- Distribution by status.
- Paid payments.
- Pending payments.

### Data

- Records table.
- Search.
- Filters by type, category, and status.
- CSV copy/export actions.

Observed record types:

- `Pago`
- `Evento`
- `Nota del mes`

Observed statuses:

- `Pagado`
- `Pendiente`
- `Programado`
- `Aprobación pendiente`

Observed initial categories:

- `Payroll`
- `Contractors & Vendors`

Important fields observed in the prototype:

- ID / record id.
- Record type.
- Date.
- Time.
- Category.
- Status.
- Vendor or contractor.
- Concept or title.
- Amount.
- Note.
- Closing/approval reminder.
- Month note.
- Updated at.

## Current module in eminat-app

Current route:

- `/cobranzas`

Main current files:

- `/home/wagner/Documentos/dev-projects/eminat/eminat_marketing/eminat-app/src/app/(app)/cobranzas/page.tsx`
- `/home/wagner/Documentos/dev-projects/eminat/eminat_marketing/eminat-app/src/features/cobranzas/`
- `/home/wagner/Documentos/dev-projects/eminat/eminat_marketing/eminat-app/src/shared/data/cobranzas.ts`
- `/home/wagner/Documentos/dev-projects/eminat/eminat_marketing/eminat-app/src/shared/data/tables.ts`

Current data model:

- `cobranzas_ventas`
- `cobranzas_cuentas`
- `cobranzas_depositos`

Current UI tabs:

- `ventas`
- `cuentas`
- `depositos`

Technical notes:

- `/home/wagner/Documentos/dev-projects/eminat/eminat_marketing/eminat-app/src/features/cobranzas/hooks/useCobranzasData.ts` currently concentrates loading, filtering, calculations, imports, exports, printing, and manual record creation.
- The current module is relatively isolated behind its route and feature folder, so changing what `page.tsx` renders should be a cheap switch.

## Production state reviewed

Production queries were aggregate-only. No detailed row data was inspected.

Row counts:

| Table | Rows | First timestamp | Last update |
|---|---:|---|---|
| `cobranzas_ventas` | 23 | 2026-04-08 | 2026-04-08 |
| `cobranzas_cuentas` | 0 | — | — |
| `cobranzas_depositos` | 0 | — | — |

Aggregate data for `cobranzas_ventas`:

- 23 rows.
- 1 distinct month.
- `mes_min = FEBRERO`.
- `mes_max = FEBRERO`.
- 2 periods.
- 7 labs.
- 14 studies.
- Total amount: `110605.48`.

Related public tables found in production:

- `cobranzas_ventas`
- `cobranzas_cuentas`
- `cobranzas_depositos`

No existing tables were found for these names or concepts:

- `billing`
- `billing_v2`
- `payment`
- `pagos`
- `cobranzas_deprecated`

## Current permissions

The permission system uses module slugs.

Relevant current slug in code:

- `MODULE.COBRANZAS = 'cobranzas'`

Production state:

- `role_modules` has `module_slug = 'cobranzas'` assigned to the `finanzas` role.
- No rows exist for `billing`, `billing_v2`, or `cobranzas_deprecated`.

Preliminary conclusion: for the cheapest first version, keep using the existing `cobranzas` permission slug for the new experience.

## Cheap-process ideas

### Preliminary recommended direction

Create a new feature for the new experience, but keep the current route and permission slug.

Proposal:

- New folder: `/home/wagner/Documentos/dev-projects/eminat/eminat_marketing/eminat-app/src/features/billing-v2`.
- New table: `billing_v2_records`.
- Keep `/cobranzas` as the visible route.
- Change `page.tsx` to render the new module.
- Keep access controlled by `has_module('cobranzas')`.
- Leave old tables intact.
- Do not automatically migrate the 23 legacy records in the first phase.

Benefits:

- Does not break existing permissions.
- Does not require role reassignment in production.
- Does not delete or transform historical data.
- Avoids forcing old report-shaped data into the new calendar-shaped model.
- Easy rollback: point `page.tsx` back to the old module if needed.

Costs:

- Historical data remains in old tables.
- Legacy code remains unless clearly archived.
- If those 23 records must appear in the new UI, we need a specific migration or manual import decision.

### Alternative A: rename the old feature to deprecated

Possible folder names:

- `/home/wagner/Documentos/dev-projects/eminat/eminat_marketing/eminat-app/src/features/cobranzas-deprecated`
- `/home/wagner/Documentos/dev-projects/eminat/eminat_marketing/eminat-app/src/features/cobranzas_legacy`
- keep `/home/wagner/Documentos/dev-projects/eminat/eminat_marketing/eminat-app/src/features/cobranzas` for the new experience

Risk: moving folders may touch several imports, although the module appears isolated.

### Alternative B: leave the old feature where it is

Keep `/home/wagner/Documentos/dev-projects/eminat/eminat_marketing/eminat-app/src/features/cobranzas` unchanged and create `/home/wagner/Documentos/dev-projects/eminat/eminat_marketing/eminat-app/src/features/billing-v2`.

Then change only:

- `/home/wagner/Documentos/dev-projects/eminat/eminat_marketing/eminat-app/src/app/(app)/cobranzas/page.tsx`

so it points to the new module.

Benefit: smallest code movement.

Cost: the `cobranzas` folder name remains attached to legacy code, while the new module lives elsewhere even though the route is still `/cobranzas`.

### Alternative C: comment out the old feature

Not recommended.

Reasons:

- Commented-out code ages badly.
- It can confuse future work more than it helps.
- It does not reduce real debt if the files remain in the repository.
- Better to leave the legacy module unimported and document its deprecated status.

## New table name options

1. `billing_v2_records`
   - Explicitly communicates a new version.
   - Avoids confusing the new model with the old `cobranzas_*` tables.

2. `cobranzas_calendario`
   - Closer to the current route and permission slug.
   - Less explicit as a versioned replacement.

Preliminary recommendation: `billing_v2_records`.

## Preliminary new table model

Possible fields:

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

Constraints still to decide:

- Whether `record_type` should be a check constraint, enum, or catalog table.
- Whether `status` is required only for payments.
- Whether categories are fixed or editable.
- Whether month notes should live as records or in a separate monthly table.

## Tentative decisions, not approved

These are not final yet:

1. Keep `/cobranzas` as the visible route.
2. Keep using the `cobranzas` permission slug.
3. Create a new feature such as `billing-v2`.
4. Create one new table such as `billing_v2_records`.
5. Do not automatically migrate the 23 legacy records.
6. Archive the old feature without commenting it out.

## Corrections expected from Wagner

Wagner said there are several corrections to make. This document exists so those corrections can be applied before we turn this into a specification or plan.

## Open questions

1. Final table name: `billing_v2_records` or `cobranzas_calendario`?
2. Final feature folder name: `billing-v2`, `cobranzas-v2`, or `cobranzas` for the new module?
3. Should old data remain as backup only, or must it appear in some report?
4. Should the URL remain `/cobranzas`, or change to `/billing`?
5. Should categories be fixed or administrable?
6. Do payments need a real approval workflow, or just a manual status?
7. Should reminders trigger real notifications, or remain only visible checkboxes?
