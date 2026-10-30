# Tasks Weekly Availability — Planned Schedules & Templates Design Notes

**Status:** Draft — captures prototype behavior, not yet approved scope

**Source:** Iterative Codex-built HTML prototypes (throwaway mockups), driven by live product-owner feedback in a single working session, 2026-10-30

**Prototype files (reference, not shipped code):**
- `weekly-availability-grid-prototype.html` — team/admin view
- `my-availability-plans-prototype.html` — non-admin self-service view

**Builds on:** `docs/superpowers/specs/2026-10-09-task-availability-design.md` (approved spec for Delivery 1) and the Delivery 2/3 sketch in `docs/superpowers/plans/2026-10-20-task-weekly-availability.md`

## 1. Purpose

Through this prototyping session the product owner pushed well past Delivery 1's single-recurring-schedule model toward something close to the original spec's Delivery 2 ("Weekly Exceptions and Advance Planning"), plus several concepts the original spec never named. This document captures what was actually built, as a Mermaid use-case diagram and a plain description, and separately lists the gaps and open questions found while reading the code — so these can be triaged (confirmed, fixed, or explicitly deferred) before any of this becomes committed scope.

This is **not** an approved specification. It is a snapshot of a prototype for review.

## 2. Vocabulary introduced in this session

| Term | Meaning |
|---|---|
| **Horario actual** (current schedule) | Whatever is in effect right now — either the habitual schedule or an active plan overriding it. Not a separate stored entity; it's a computed state. |
| **Horario habitual** (habitual schedule) | The one typical recurring week (Monday–Sunday, repeats forever). Every user has exactly one. |
| **Horario planificado** (planned schedule / plan) | A date-bound override: a start date (required) and an end date (optional — absent means "indefinido," active until another plan supersedes it). While its range covers today, it governs instead of the habitual schedule; the habitual schedule resumes automatically once the plan ends or is superseded. |
| **Plantilla guardada** (saved template) | A reusable, date-less snapshot of a week. Has no effect on its own. "Usar" converts it into a new planned schedule by asking the user to pick dates — it never changes what's currently active by itself. |

## 3. Actors

Two actors use this feature. **Administrador is not a separate, more restricted role** — an admin gets every self-service capability a regular team member gets for their own schedule, plus one additional capability: read-only oversight of teammates' schedules.

- **Miembro del equipo** (regular team member): manages only their own habitual schedule, planned schedules, and templates.
- **Administrador**: everything above, for their own schedule, *plus* read-only viewing of every relevant teammate's current schedule.

## 4. Use-case diagram

```mermaid
flowchart LR
    Member["Miembro del equipo"]
    Admin["Administrador"]

    subgraph Habitual["Horario habitual"]
        UC1["Editar el horario habitual\n(grilla semanal, Lun–Dom)"]
        UC2["Ver el horario habitual\nvs. 40h esperadas"]
    end

    subgraph Plans["Horarios planificados"]
        UC3["Crear un horario planificado\n(fecha inicio obligatoria,\nfecha fin opcional = indefinido)"]
        UC4["Editar / renombrar\nun horario planificado"]
        UC5["Eliminar un horario planificado\n(con confirmación)"]
        UC6["Ver cuál horario está\nActivo ahora (auto, por fecha)"]
    end

    subgraph Templates["Plantillas guardadas"]
        UC7["Guardar el horario abierto\ncomo plantilla nueva"]
        UC8["Renombrar / eliminar\nuna plantilla"]
        UC9["Usar una plantilla\n(elige fechas → crea un\nhorario planificado nuevo;\navisa si se superpone)"]
    end

    subgraph RangeEditing["Edición de rangos (dentro de cualquier horario)"]
        UC10["Crear un rango\n(click = 1h, arrastrar = tramo exacto)"]
        UC11["Redimensionar un rango\n(arrastrar sus bordes)"]
        UC12["Eliminar un rango individual\n(sin confirmación)"]
    end

    subgraph AdminOnly["Solo administrador"]
        UC13["Ver el horario de un\ncompañero (solo lectura)"]
    end

    Member --> UC1 & UC2 & UC3 & UC4 & UC5 & UC6 & UC7 & UC8 & UC9 & UC10 & UC11 & UC12
    Admin --> UC1 & UC2 & UC3 & UC4 & UC5 & UC6 & UC7 & UC8 & UC9 & UC10 & UC11 & UC12
    Admin --> UC13
```

Shared use cases (UC1–UC12) belong to both actors identically — an admin's own schedule works exactly like a regular member's. UC13 is admin-only, additive, and read-only.

## 5. Interaction architecture: modal-only, unified for self and teammate viewing

This repo's own codebase was checked directly, not assumed. Dynamic page routes (`src/app/.../[id]`) are the rare exception — exactly one exists in the whole app, `src/app/(app)/meetings/[id]` — while modal components for "view or edit one record's detail" are the dominant, established pattern across several features: `PacientesImportModal` (medical), `CampaignViewModal`/`LeadFormModal`/`LeadImportModal`/`EmailCountModal`/`TitleMatchModal` (research), `ActivityDetailModal`/`NewActivityModal` (tasks). Meanwhile, the currently-shipped real app (Delivery 1, already in production) uses a *third* pattern for this one feature: inline expand/collapse in the team list — click your own card's pencil, the editor mounts in place, replacing your card in the list. That inline pattern is reasonable for small content (a handful of fields) but doesn't fit the now much larger self-service content (habitual + planned schedules + templates, each with their own grid editor): every other card in the list reflows awkwardly when it opens, and it can't give the focused-task feel a modal gives.

**Decision:** standardize on one interaction for viewing or editing any person's schedule. Click their card; a modal opens with the same content component. It's editable only if it's your own schedule — a teammate's or (for an admin) any other relevant user's schedule opens the identical modal and component, always read-only, never a second code path. This replaces the real app's current inline-expand pattern (a real migration of already-shipped Delivery 1 UI, not just new work on top of it) and avoids introducing a second new pattern (a dynamic route) that would create exactly the kind of inconsistency this repo already has in `meetings/[id]`.

**Non-admin scoping is orthogonal to this decision.** The modal-click mechanism is identical for every actor; the only thing that differs by role is *which cards are visible/clickable* in the team list, never how opening one behaves. A regular team member's card list is restricted to their own team (per §4.5 of the approved Delivery 1 spec: read same-team, edit only self); an admin's card list includes every relevant user org-wide (read-all, edit only self). **Neither prototype file currently demonstrates the restricted, same-team-only list a regular member would see** — `weekly-availability-grid-prototype.html`'s team strip is a fixed four-member array with no team-membership filtering at all (confirmed: no `equipo`/team-scoping logic anywhere in the file), and `my-availability-plans-prototype.html` never shows a team list at all, only the logged-in user's own schedule. This is a real gap in the prototypes, not a decided behavior — see gap 6 below.

## 6. Gaps and open questions

Each item below was verified against the actual prototype code, not assumed. Two items from an earlier pass of this document turned out to be stale — the features had since landed — and are corrected below, with the line references that confirm it.

1. **The admin's teammate viewer does not know about plans or templates — now resolved by the architecture decision above, but not yet reflected in the prototype.** `memberRanges(memberId)` for any teammate other than the logged-in user still returns a flat `saved`/`draft` ranges array (`weekly-availability-grid-prototype.html`, `memberSchedules` + `memberRanges`), with no concept of that teammate's own active plan overriding their habitual schedule. Per §5's decision, the real fix isn't a separate teammate-viewer code path at all — it's the *same* self-service component, opened read-only. The prototype's current admin-viewer predates that decision and still needs to be rebuilt on top of it rather than patched in place.

2. **"Planned schedules use real calendar dates instead of repeating weekday columns" — implemented, confirmed by reading the code.** Both files generate real per-date columns for a plan's editor specifically: `calendarDays(start, end)` (`weekly-availability-grid-prototype.html:868`, `my-availability-plans-prototype.html:447`) walks every calendar day from `startDate` to `endDate` inclusive (or, with no end date, defaults to a 7-day span) and returns one entry per real date, each carrying its own ISO date, formatted label, and weekday name — not a repeating weekday pattern. `isCalendarEditor()` (`weekly-availability-grid-prototype.html:804`, `my-availability-plans-prototype.html:721`) gates this to plans only (habitual and templates keep the generic 7-column Monday–Sunday grid), and `editorDays()` / `editorDateChanged()` re-render the grid live as the start/end date fields change. A two-week plan does correctly let week 1 and week 2 differ — confirmed, not just claimed.

3. **"Auto-snapshot the habitual schedule as a template when it changes" — implemented, confirmed by reading the code.** In both files, the habitual save path checks whether the ranges about to be overwritten actually differ from what's being saved, and if so pushes a new template built from the *prior* ranges, named `'Horario habitual — ' + formatPlanDate(replacementDate())`, before committing the new ranges (`weekly-availability-grid-prototype.html:1530-1539`; `my-availability-plans-prototype.html:781-786`, `meta: 'Guardada automáticamente'`). No snapshot is created when nothing actually changed (reuses the existing dirty-check), matching what was asked for.

4. **What happens to a deleted plan/template if it's currently active?** Deleting a plan or template goes through a confirmation modal that unconditionally removes the entry (`deletePromptConfirm` handlers in both files) and then just re-renders. If the deleted entry was the one currently "Activo ahora," the system falls back to whatever `activePlan()` recomputes next — in practice, the habitual schedule, since the deleted plan is simply gone from the `plans`/`state.plans` array. This isn't broken, but it's also not explicitly surfaced to the user in the confirmation copy ("¿Eliminar «X»? Esta acción no se puede deshacer." doesn't mention that deleting an *active* plan immediately changes what the team sees as this person's current schedule).

5. **Superseding an indefinite-end plan doesn't change its own data, which is a deliberate and sound choice, but is subtle.** When a new plan is activated while a previous open-ended plan is active, `planPhase()` computes the old plan's status as `'replaced'` by checking whether a *later-added* plan's start date has arrived — the superseded plan's own `endDate` stays `null` forever; it's the phase-computation function, not the data, that marks it inactive (`nextPlanAfter()` in both files, confirmed by reading the comment "A later plan supersedes an open-ended one permanently, even after it ends. Keep endDate null"). This is a reasonable modeling choice (the data stays honest: "I never got an end date, something else just started") but it means a `'replaced'` plan's own card will say "sin fecha de fin" (no end date) while also saying "Reemplazado desde el \<date\>" — worth confirming this reads clearly rather than as a contradiction once this leaves prototype stage.

6. **The auto-generated template name does not collide with the reserved-name check — verified, now that gap 3 above is confirmed built.** The reserved-name check (`validateEditorName`, both files) rejects only an exact case-insensitive match to "mi horario habitual" / "horario habitual"; the auto-generated name `'Horario habitual — ' + formatPlanDate(...)` always carries the em dash and a date, so it never matches exactly. No fix needed here.

7. **Activation is driven by a hardcoded demo date, not a real clock.** Both files define `var DEMO_TODAY = '2024-10-22'` (or equivalent) and every activation/phase computation (`planPhase`, `activePlan`) compares against that fixed string, never `new Date()`. This is correct and intentional for a demo (the comment in the code says so explicitly: "Freeze this demo on Tuesday; never use the machine clock for activation"), but the real implementation must replace this with the actual current date in the server's or user's relevant timezone — this app uses `America/Guayaquil` elsewhere (per this repo's `CLAUDE.md` and the date-formatting calls already in these prototypes, e.g. `toLocaleString('es-EC', { timeZone: 'America/Guayaquil', ... })`).

8. **Overlap detection only looks at plans, never at the habitual schedule itself** — which is correct, since the habitual schedule has no date range to overlap with, but means a user could create two plans whose ranges overlap *each other's dates* without warning if the second one is created through "+ Planificar un horario puntual" directly rather than through "Usar" on a template (`overlappingPlans()` is only called from the template-use flow, `updateTemplateUseState()`, not from the direct new-plan path, `newPlanBtn`'s handler). Worth deciding whether direct plan creation should get the same overlap check.

9. **Neither prototype demonstrates a regular (non-admin) member's restricted, same-team-only view of teammates.** Confirmed by reading both files: `weekly-availability-grid-prototype.html`'s team strip renders a fixed four-member array with no team-membership check anywhere in the file, and `my-availability-plans-prototype.html` never renders any other user's card at all — it's purely the logged-in user's own view. §5 above names this as the open gap it is; it needs its own prototype pass (or explicit deferral) before the modal-unification decision can be called fully demonstrated for the non-admin case, not just the admin case.

## 6. Delivery mapping

**Maps to the original spec's Delivery 2 scope** ("plan a different schedule for a specific week," "distinguish the recurring template from an override," "return to the recurring schedule when no override applies"):
- Planned schedules (date-bound, auto-activating, auto-reverting)
- Multiple planned schedules existing at once, with one active at a time

**Goes beyond Delivery 2 as originally written — invented during this prototyping session, not yet signed off as committed scope:**
- The reusable, date-less "template" concept and its "Usar → pick dates → becomes a plan" conversion flow
- Auto-snapshotting the habitual schedule as a template on change (built, see gap 3)
- Calendar-date (not repeating-weekday) editing for plans (built, see gap 2)
- Indefinite/open-ended plan end dates with implicit supersession by a later plan
- Weekend (Saturday/Sunday) columns in the grid — the real domain model already allowed this (ISO weekdays 1–7), but the original spec's examples and UI sketch were Mon–Fri only
- Modal-only interaction, unified for self and teammate viewing, replacing Delivery 1's shipped inline-expand editor (§5) — a real migration of existing production UI, not additive work

Everything in the second list should get the product owner's explicit go-ahead before being treated as scope for any delivery, rather than carried forward by prototyping momentum alone.
