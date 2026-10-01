# Multiple responsibles per task, with an optional leader

**Date:** 2026-10-01 · **Module:** `/tasks` · **Status:** design approved in chat, pending spec review

## Why

The team asked to assign more than one person to the same task, and optionally mark one of them
as the leader. Today a task has exactly one (nullable) responsible: `actividades.responsable_id`.

## Decisions taken

| Question | Decision |
|---|---|
| Payroll (Report tab) | **Each responsible gets the full task** on their payment sheet, as if they did it alone. |
| What the leader changes | **Only a visible label.** No permissions, no payroll effect. |
| Storage | **Join table** `actividad_responsables`; `actividades.responsable_id` is dropped. |
| Zero responsibles | Still valid ("unassigned"), as today. |
| Workload views | A task counts for **every** responsible (same rule as payroll). |
| Tight spots (card, Gantt, row) | **Leader name + "+N"**; without a leader, the first one alphabetically. |
| Form picker | **Checklist + crown toggle** on each checked row. |
| Crown icon | Lucide `Crown`, **monochrome** (`currentColor`, inherits the text color). No emoji, no gold. |

## 1. Data model and migration

```sql
create table public.actividad_responsables (
  actividad_id uuid not null references public.actividades(id) on delete cascade,
  usuario_id   uuid not null references public.usuarios(id),
  es_lider     boolean not null default false,
  primary key (actividad_id, usuario_id)
);
create unique index actividad_responsables_un_lider
  on public.actividad_responsables (actividad_id) where es_lider;
```

One migration, in order:

1. Create the table + index + RLS.
2. Backfill: one row per `actividades.responsable_id is not null`, `es_lider = false`.
3. Rewrite every database object that reads `responsable_id` to use the table:
   - the user-reassignment RPC (`remote_schema.sql:93-106`, later revised in
     `20260626210000_reassign_optional_heir.sql`);
   - the two workload views (`remote_schema.sql:771`, `:839`) — keep `security_invoker`;
   - `create_meet_activity_for_topic` (`20260918120000_…`);
   - the audit-history trigger (`20260830011448_historial_auditoria.sql`).
4. Drop `actividades.responsable_id`.

**RLS** on `actividad_responsables` mirrors `actividades`: whoever can see/edit the task can
see/edit its responsibles, gated by `has_module('tasks')`. RLS must be enabled
(`relrowsecurity = true`) and verified by querying as `anon` and as a non-admin user.

**Reassign on user delete:** the heir replaces the deleted user on each task; if the heir is
already on that task, the duplicate row is dropped; if the deleted user was leader, the heir
inherits the leadership.

## 2. Frontend

- **Type:** `Actividad` loses `responsable_id`, gains
  `responsables: { usuario_id: string; es_lider: boolean }[]`.
- **Loading:** `loadAppData` embeds `actividad_responsables` with an explicit `!fk_name`
  (avoids PGRST201).
- **Domain helpers** (one module, with tests):
  - `responsablePrincipal(act)` → the leader, else the first by name, else `null`;
  - `esResponsable(act, usuarioId)` → membership.
  The 23 call sites of `responsable_id` in `src/` switch to these.
- **Filters** (`act-filters/grupos/gente.ts`): a person matches if they are any responsible.
- **Payment report** (`report-filter.ts`, `report-html/`): "executed by" = `esResponsable`;
  every responsible gets the full task. The printed sheet lists all names in the column.
- **Form** (`ActivityAsignacion`, `useActividadForm`, `act-form`): searchable checklist of the
  same assignable list as today (`deriveMiembrosAsignables`). Each checked row has a crown
  button; clicking sets that person as leader and clears any other; clicking the active one
  unsets it. Unchecking the leader also clears the leadership.
- **Compact displays** (Kanban card, Gantt bar, table row, recent activity):
  `[Crown] Ana Bravo +4` with a leader; `Ana Bravo +4` (no crown) without; `—` with nobody.
- **Detail view:** all names; the leader carries the crown.
- **Roster / Org / member-availability cards:** count with `esResponsable`.
- **i18n:** new keys in `es.json` and `en.json` (leader label, "+{n}", crown button aria-label).
  The crown button needs an `aria-label` and `aria-pressed`.

## 3. Saving, Meet API, errors

- **Atomic save:** RPC
  `set_actividad_responsables(p_actividad_id uuid, p_usuario_ids uuid[], p_lider_id uuid)`,
  `security invoker` (RLS still applies), replaces the set in one transaction, and raises if
  `p_lider_id` is not null and not in `p_usuario_ids`. Create = insert task, then RPC; if the
  RPC fails the form shows the error and keeps its state.
- **Meet API** (`integrations/meet/_shared/contracts.ts`, `task-service.ts`), backward
  compatible:
  - requests accept the current single `responsable_id` **or** an optional
    `responsable_ids: uuid[]`;
  - responses keep `responsable_id` (= `responsablePrincipal`) and add `responsables[]`.
  The integration owner is notified before deploy.

## 4. Testing

- Unit: `responsablePrincipal`, `esResponsable`, filters, `report-filter` (a task with two
  responsibles appears on both sheets), the form's crown toggle logic.
- DB (local Supabase): RPC rejects a leader outside the set; a second leader violates the index;
  reassign drops duplicates and transfers leadership; RLS blocks `anon`.
- e2e: create a task with three people and a leader → card shows `[Crown] <leader> +2`; the
  Report tab lists it for all three.
- Permissions are checked with a **non-admin** account (admin short-circuits `is_admin()`).

## 5. Rollout

Local `migration up` → full gate → backup + precheck → `migration list --linked` → prod
`db push` → merge the frontend PR. The migration lands **before** the merge: the new code needs
the table.

## Out of scope

- Splitting hours/pay between responsibles.
- Leader-only permissions (moving columns, closing tasks).
- Ordering responsibles by selection order.
