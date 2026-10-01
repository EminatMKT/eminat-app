# Multiple Responsibles per Task Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Do **not** commit unless the user explicitly asks later.

**Goal:** Replace the single task assignee with multiple responsibles plus an optional visible leader, without breaking Meet integration compatibility or payroll/report semantics.

**Architecture:** Store responsibility in a new `public.actividad_responsables` join table and drop `actividades.responsable_id` only after backfilling and rewriting every dependent database object. The frontend loads the join rows with an explicit Supabase FK embed, uses small domain helpers for membership/display, and keeps route handlers thin by pushing compatibility mapping into Meet shared services.

**Tech Stack:** Next.js App Router, TypeScript, Supabase/Postgres migrations + RLS, Vitest, Playwright, lucide-react, shared `useT()` i18n.

---

## ASSUMPTION PREFLIGHT

Run these before implementation starts and paste their output into the PR notes. This section intentionally verifies every factual claim the spec makes about the current repo/schema; if any status changes before implementation, update the task list first.

### Verified context

| Claim from spec/input | Verification command / file:line | Status | Notes |
|---|---|---:|---|
| Worktree is on `feat/multi-responsables` with latest commits `d0aa6b9` and `ceaa3c5`. | `git branch --show-current && git log --oneline -2` -> `feat/multi-responsables`, `ceaa3c5 docs: notify every responsible...`, `d0aa6b9 docs: spec...`. | TRUE | Verified 2026-10-01. |
| The approved spec exists. | `sed -n '1,240p' docs/superpowers/specs/2026-10-01-multi-responsables-design.md`. | TRUE | File contains the approved design. |
| `actividades.responsable_id` is nullable today. | `grep -RInE 'responsable_id.*(NOT NULL|SET NOT NULL|DROP NOT NULL|NULL)|if \(!valores\.responsable_id\)' supabase/migrations src/features/tasks/hooks/useActividadForm src/features/tasks/types.ts` -> `supabase/migrations/20260811235816_drop_responsable_ref.sql:12 ALTER TABLE public.actividades ALTER COLUMN responsable_id SET NOT NULL;` and `src/features/tasks/hooks/useActividadForm/index.ts:88` requires it. | FALSE | Current DB/form require one responsible. The migration must deliberately re-enable zero responsibles by using the join table, not assume current parity. |
| A task has exactly one current responsible. | `src/shared/context/loadAppData.ts:69` has `responsable_id?: string`; `src/features/tasks/types.ts:40` has form `responsable_id: string`; `src/shared/data/actividades.ts:42-43` selects `*`. | TRUE | It is a single FK column now. |
| `responsable_id` is read in 23 non-test `src` files. | `grep -rlE 'responsable_id' src --include='*.ts' --include='*.tsx' | grep -v test | sort | tee /tmp/responsable-files.txt; wc -l < /tmp/responsable-files.txt` -> `23`. | TRUE | The 23 files are listed below. |
| Report filter reads `responsable_id` at the cited lines. | `nl -ba src/features/tasks/report-filter.ts | grep -C 3 'responsable_id'` -> lines `9`, `19`, `42`. | TRUE | Must switch to helper membership. |
| Report HTML prints the single responsible at the cited line. | `nl -ba src/features/tasks/utils/report-html/index.ts | grep -C 3 'responsable_id'` -> line `34`. | TRUE | Must print all names. |
| Meet contracts expose single `responsable_id` at the cited lines. | `nl -ba src/app/api/integrations/meet/_shared/contracts.ts | grep -C 3 'responsable_id'` -> lines `11`, `21`, `36`. | TRUE | Must accept old/new request shapes and add response array. |
| Meet task service reads/writes single `responsable_id`. | `nl -ba src/app/api/integrations/meet/_shared/task-service.ts | grep -C 3 'responsable_id'` -> projection line `5`, type line `13`, canonical line `26`, auth filter line `87`, create RPC lines `122-129`, update line `138`. | TRUE | Must change projection and mapping. |
| `loadAppData` currently reads `responsable_id`. | `nl -ba src/shared/context/loadAppData.ts | sed -n '60,85p'` -> line `69` and comments at `81-83`; `nl -ba src/shared/context/loadAppData.ts | sed -n '271,282p'` calls `actividadesRepo.list()`. | TRUE | The embed belongs in `src/shared/data/actividades.ts`, consumed by `loadAppData`. |
| Create notification is one row to single responsible only. | `nl -ba src/features/tasks/hooks/useActividadForm/index.ts | sed -n '82,114p'` -> lines `111-113`. | TRUE | Must batch insert on create and diff newly added responsibles on edit. |
| User-reassignment RPC has a later definition than the remote schema. | `nl -ba supabase/migrations/20260830011448_historial_auditoria.sql | sed -n '136,215p'` -> latest `public.admin_reassign_and_delete` definition updates `actividades.responsable_id` at lines `174-183`; `supabase/migrations/20260626210000_reassign_optional_heir.sql:17-118` is earlier; `remote_schema.sql:48-142` is oldest. | TRUE | Rewrite the latest function, not the dump. |
| Workload view `v_equipo_hoy` latest definition still reads `responsable_id`. | `grep -RInE 'CREATE( OR REPLACE)? VIEW public\\.v_equipo_hoy|CREATE VIEW "public"\."v_equipo_hoy' supabase/migrations` -> latest `supabase/migrations/20260808201243_drop_jornada_legacy_columns.sql:60`; `nl -ba ... | sed -n '60,83p'` -> line `79`. | TRUE | Use join table count in latest recreated view. |
| Workload view `v_produccion_responsable` reads `responsable_id`. | `nl -ba supabase/migrations/20260612193730_remote_schema.sql | sed -n '814,844p'` -> line `839`. No later recreation found by `grep -RInE 'CREATE( OR REPLACE)? VIEW public\\.v_produccion_responsable|CREATE VIEW "public"\."v_produccion_responsable' supabase/migrations`. | TRUE | Rewrite from the remote schema definition. |
| Spec says the two workload views should keep `security_invoker`. | `grep -RIn 'security_invoker\\|security invoker' supabase/migrations` only finds comments in `20260831214348_revocar_anon_vistas.sql:4,30,33`; current view definitions omit the option. | FALSE in current repo | The migration must deliberately add `WITH (security_invoker = true)` when recreating both workload views, because the approved spec requires it. Verify behavior with non-admin module users and keep anon revoked. |
| `create_meet_activity_for_topic` reads/writes `responsable_id`. | `nl -ba supabase/migrations/20260918120000_create_meet_activity_for_topic.sql | sed -n '1,52p'` -> parameter line `4`, insert lines `37-43`. | TRUE | Replace with array support and join table insert. |
| Audit trigger object mentioned by the spec is not the task audit trigger. | `nl -ba supabase/migrations/20260830011448_historial_auditoria.sql | sed -n '25,65p'` logs reuniones/pending fields only; `nl -ba supabase/migrations/20260829210325_rls_encendida_cuatro_tablas.sql | sed -n '33,55p'` defines `log_cambio_actividad()` for task changes. | FALSE | Implement responsibility audit with a new `log_cambio_actividad_responsables()` trigger on the join table, writing `historial` rows with `campo = 'responsables'`. Do not edit `log_reunion()` for task assignees. |
| RLS for `actividades` currently gates Tasks/Stratix and checks module slugs via variables. | `nl -ba supabase/migrations/20260903235201_actividades_policy_tasks.sql | sed -n '11,45p'` -> `slug_tasks`, `slug_stratix`, `RAISE EXCEPTION`, policy condition. | TRUE | Mirror this convention for the join table. |
| `reunion_pendientes` has its own unrelated `responsable_id`. | `grep -RIn 'reunion_pendientes.*responsable_id|responsable_id.*reunion_pendientes' supabase/migrations/20260829221511_reuniones_esquema.sql supabase/migrations/20260830011448_historial_auditoria.sql` -> schema line `84`, policy lines `200-201`, comments `133-134`. | TRUE | Do not touch it except to avoid accidental grep-driven rewrites. |
| i18n JSON files are `src/shared/i18n/locales/es.json` and `src/shared/i18n/locales/en.json`. | `find src/shared/i18n -maxdepth 3 -type f | sort`. | TRUE | Add keys to both; no `i18n-ignore`. |
| Gate commands must use package scripts. | `node -e "const p=require('./package.json'); console.log(JSON.stringify(p.scripts,null,2))"` -> `test`, `typecheck`, `lint`, `e2e`, `rules:sweep`, `rules:check`, `db:rls`, `lint:css`. | TRUE | Use these exact names. |

### Current 23 non-test `responsable_id` files under `src/`

```text
src/app/api/admin/delete-user/route.ts
src/app/api/integrations/meet/_shared/contracts.ts
src/app/api/integrations/meet/_shared/task-service.ts
src/features/admin/components/OrgCard.tsx
src/features/stratix-mkt/components/roster/RosterCard/index.tsx
src/features/tasks/components/gantt/GanttBar/index.tsx
src/features/tasks/components/kanban/KanbanTaskCard/index.tsx
src/features/tasks/components/modals/ActivityAsignacion/index.tsx
src/features/tasks/components/overview/RecentActivityRow/index.tsx
src/features/tasks/components/reporte/ReporteTab/index.tsx
src/features/tasks/components/solicitudes/MemberAvailabilityCard/index.tsx
src/features/tasks/components/solicitudes/TaskTableRow/index.tsx
src/features/tasks/hooks/useActividadForm/index.ts
src/features/tasks/hooks/useActividadForm/payload.ts
src/features/tasks/hooks/useTablero/index.ts
src/features/tasks/report-filter.ts
src/features/tasks/types.ts
src/features/tasks/utils/act-detail-fields/grupos/asignacion.ts
src/features/tasks/utils/act-filters/grupos/gente.ts
src/features/tasks/utils/act-form.ts
src/features/tasks/utils/departamento/index.ts
src/features/tasks/utils/report-html/index.ts
src/shared/context/loadAppData.ts
```

## File map

### Create

- `supabase/migrations/<timestamp>_actividad_responsables.sql` — table, backfill, latest object rewrites, RLS, RPCs, drop old column/index/FK.
- `src/features/tasks/utils/responsables/index.ts` — `responsablePrincipal`, `esResponsable`, display helpers, notification diff helper.
- `src/features/tasks/utils/responsables/index.test.ts` — helper/unit tests.
- `src/features/tasks/hooks/useActividadForm/responsables.ts` — pure form toggle helpers for checked rows and crown state.
- `src/features/tasks/hooks/useActividadForm/responsables.test.ts` — toggle/diff tests.
- `e2e/tasks-multi-responsables.spec.ts` — create task with three responsibles and verify card/report.

### Modify

- DB: latest definitions in the new migration only; do not edit old migrations.
- Data/types: `src/shared/context/loadAppData.ts`, `src/shared/data/actividades.ts`, `src/features/tasks/types.ts`.
- Existing call sites: the 23 files listed above.
- Form: `src/features/tasks/components/modals/ActivityAsignacion/index.tsx`, `src/features/tasks/hooks/useActividadForm/index.ts`, `src/features/tasks/hooks/useActividadForm/payload.ts`, `src/features/tasks/utils/act-form.ts`, related tests.
- Compact/detail display: Kanban, Gantt, table row, recent row, detail field builders.
- Reports: `src/features/tasks/report-filter.ts`, `src/features/tasks/utils/report-html/index.ts`, `src/features/tasks/components/reporte/ReporteTab/index.ts`, tests.
- Meet API: `src/app/api/integrations/meet/_shared/contracts.ts`, `task-service.ts`, `src/app/api/integrations/meet/_shared/contracts.test.ts`, `src/app/api/integrations/meet/_shared/task-service.test.ts`, `src/app/api/integrations/meet/tasks/route.test.ts`, `src/app/api/integrations/meet/tasks/[activityId]/route.test.ts`.
- i18n: `src/shared/i18n/locales/es.json`, `src/shared/i18n/locales/en.json`.

## Completion audit

This plan was reviewed against the approved spec and the writing-plan checklist on 2026-10-01. It was incomplete in three places before this revision: view security was left as a reviewer choice despite the spec requiring `security_invoker`, responsibility audit was unresolved, and several implementation steps described behavior without enough typed contracts. The sections below resolve those gaps so implementers do not need product decisions before starting.

### Resolved implementation decisions

1. **Workload view security:** recreate both workload views with `WITH (security_invoker = true)`, then explicitly `REVOKE ALL ON public.v_equipo_hoy, public.v_produccion_responsable FROM anon` and grant only the roles already allowed by the repo's view policy pattern. Verify with a non-admin user because admin short-circuits module checks.
2. **Responsibility audit:** add `public.log_cambio_actividad_responsables()` as a `SECURITY DEFINER` trigger function on the join table. It writes one row to `historial` after insert/delete/update with `tabla = 'actividad_responsables'`, `registro_id = actividad_id`, `accion` matching the operation, `campo = 'responsables'`, `valor_anterior` as the old `usuario_id`/`es_lider` JSON for delete/update, and `valor_nuevo` as the new JSON for insert/update. Do not modify `log_reunion()`.
3. **Zero responsibles:** zero responsibles is intentional new behavior even though current DB/form require one responsible; remove form validation for responsible and let `set_actividad_responsables(..., ARRAY[]::uuid[], null)` clear the set.
4. **Compatibility boundary:** `responsable_id` may remain only in Meet request/response compatibility contracts/tests and in migration SQL while rewriting old objects. All app-domain `Actividad` values use `responsables`.

## Implementation tasks

### Task 1: Migration skeleton and DB TDD checks

**Files:**
- Create: `supabase/migrations/<timestamp>_actividad_responsables.sql`
- Add DB verification SQL temporarily in `/tmp/multi-responsables-db-check.sql` while implementing; do not commit `/tmp`.

- [ ] **Step 1: Create the migration file locally**

Run:
```bash
pnpm supabase migration new actividad_responsables
```
Expected: a new SQL file appears under `supabase/migrations/` with the timestamp prefix. Do not use any destructive database reset command.

- [ ] **Step 2: Write failing DB precheck SQL in `/tmp/multi-responsables-db-check.sql`**

Use checks for: table exists, RLS enabled, unique leader index, backfilled row count equals current non-null `actividades.responsable_id`, RPC rejects leader outside set, second leader violates the partial unique index, anon cannot read, non-admin Tasks/Stratix user can read/write according to module policy, both workload views have `security_invoker = true`, and insert/update/delete on `actividad_responsables` write `historial` rows.

Run:
```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f /tmp/multi-responsables-db-check.sql
```
Expected before implementation: FAIL because `public.actividad_responsables` does not exist.

- [ ] **Step 3: Implement the migration**

Include, in this order:
1. `BEGIN;`
2. Module slug variables (`slug_tasks text := 'tasks'; slug_stratix text := 'stratix-mkt';`) and `RAISE EXCEPTION` if either is missing.
3. Create `public.actividad_responsables` using repo FK naming convention:
   - `actividad_id uuid not null`
   - `usuario_id uuid not null`
   - `es_lider boolean not null default false`
   - `primary key (actividad_id, usuario_id)`
   - FK names should be explicit, e.g. `actividad_responsables_actividad_id_fkey`, `actividad_responsables_usuario_id_fkey`.
4. Partial unique index `actividad_responsables_un_lider` on `(actividad_id) where es_lider`.
5. Enable RLS on `actividad_responsables`.
6. Policies that mirror current `actividades` access with the same `(has_module('tasks') OR has_module('stratix-mkt'))` condition and require the referenced task to be visible/editable. Do not authorize merely for having a session.
7. Backfill from `actividades.responsable_id` with `es_lider = false`.
8. Create `public.set_actividad_responsables(p_actividad_id uuid, p_usuario_ids uuid[], p_lider_id uuid default null)` as `SECURITY INVOKER`, with:
   - leader must be null or in `p_usuario_ids`;
   - duplicate IDs are deduplicated;
   - replace set in one transaction;
   - update `actividades.updated_at` so optimistic UI sees the change.
9. Rewrite latest `public.admin_reassign_and_delete` from `20260830011448_historial_auditoria.sql:136-215` so heir replacement updates the join table, drops duplicate rows when the heir is already present, and transfers `es_lider` when the deleted user was leader.
10. Rewrite `v_equipo_hoy` from `20260808201243_drop_jornada_legacy_columns.sql:60-83` to count rows via `actividad_responsables`.
11. Rewrite `v_produccion_responsable` from `20260612193730_remote_schema.sql:814-844` to left join the join table before `actividades` so every responsible gets the full task.
12. Recreate `v_equipo_hoy` and `v_produccion_responsable` with `WITH (security_invoker = true)`, restore/recheck grants, and keep anon revoked for sensitive views.
13. Rewrite `create_meet_activity_for_topic` so it accepts `p_responsable_ids uuid[]` and optional leader, inserts the activity without `responsable_id`, then calls `set_actividad_responsables`.
14. Add `log_cambio_actividad_responsables()` and triggers on `actividad_responsables` for INSERT/UPDATE/DELETE audit rows; do not change `log_reunion()` for task assignees.
15. Drop `idx_actividades_responsable`, FK on `actividades.responsable_id`, and column `actividades.responsable_id`.
16. `COMMIT;`

- [ ] **Step 4: Apply the local migration**

Run:
```bash
pnpm supabase migration up
```
Expected: migration applies cleanly. Do not use a local database reset command.

- [ ] **Step 5: Verify DB behavior**

Run:
```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f /tmp/multi-responsables-db-check.sql
pnpm db:rls
```
Expected: PASS; `actividad_responsables.relrowsecurity = true`; anon is blocked; non-admin module user is tested because admin short-circuits `is_admin()`.

### Task 2: Types, domain helpers, and pure tests

**Files:**
- Modify: `src/shared/context/loadAppData.ts`
- Modify: `src/features/tasks/types.ts`
- Create: `src/features/tasks/utils/responsables/index.ts`
- Create: `src/features/tasks/utils/responsables/index.test.ts`

- [ ] **Step 1: Write failing helper tests**

Cover:
- leader wins over alphabetical order;
- no leader picks first display name alphabetically;
- no responsibles returns `null`;
- `esResponsable` checks membership;
- compact label returns `Ana Bravo +2` and marks whether crown should render.

Run:
```bash
pnpm test src/features/tasks/utils/responsables/index.test.ts
```
Expected: FAIL because the module does not exist.

- [ ] **Step 2: Add typed shapes and helpers**

Use this exact type in `src/features/tasks/types.ts` and in the canonical `Actividad` shape from `src/shared/context/loadAppData.ts`:
```ts
export type ActividadResponsable = {
  usuario_id: string
  es_lider: boolean
}
```

Create `src/features/tasks/utils/responsables/index.ts` with these exported contracts:
```ts
import type { ActividadResponsable } from '../../types'

type UsuarioLike = { id: string; nombre?: string | null; name?: string | null; email?: string | null }
type ActividadLike = { responsables?: ActividadResponsable[] | null }

const nombreDe = (u: UsuarioLike | undefined) => u?.nombre || u?.name || u?.email || ''

export function responsablesOrdenados(act: ActividadLike, usuarios: UsuarioLike[]): ActividadResponsable[] {
  const porId = new Map(usuarios.map(u => [u.id, u]))
  return [...(act.responsables ?? [])].sort((a, b) => {
    if (a.es_lider !== b.es_lider) return a.es_lider ? -1 : 1
    return nombreDe(porId.get(a.usuario_id)).localeCompare(nombreDe(porId.get(b.usuario_id)), 'es')
  })
}

export function responsablePrincipal(act: ActividadLike, usuarios: UsuarioLike[]): ActividadResponsable | null {
  return responsablesOrdenados(act, usuarios)[0] ?? null
}

export function esResponsable(act: ActividadLike, usuarioId: string | null | undefined): boolean {
  if (!usuarioId) return false
  return (act.responsables ?? []).some(r => r.usuario_id === usuarioId)
}

export function etiquetaResponsablesCompacta(act: ActividadLike, usuarios: UsuarioLike[]): { label: string; lider: boolean } {
  const ordenados = responsablesOrdenados(act, usuarios)
  const principal = ordenados[0]
  if (!principal) return { label: '—', lider: false }
  const nombre = nombreDe(new Map(usuarios.map(u => [u.id, u])).get(principal.usuario_id)) || '—'
  const extra = ordenados.length > 1 ? ` +${ordenados.length - 1}` : ''
  return { label: `${nombre}${extra}`, lider: principal.es_lider }
}
```
Add `responsables: ActividadResponsable[]` to canonical `Actividad` and remove `responsable_id` from the new canonical type. Avoid `any`.

- [ ] **Step 3: Pass helper tests**

Run:
```bash
pnpm test src/features/tasks/utils/responsables/index.test.ts
pnpm typecheck
```
Expected: helper tests PASS; typecheck still may fail at old call sites, which is expected until Tasks 4-8.

### Task 3: `loadAppData` and Supabase FK embed

**Files:**
- Modify: `src/shared/data/actividades.ts:42-47`
- Modify: `src/shared/context/loadAppData.ts:60-85,271-282`

- [ ] **Step 1: Write/adjust a failing data-shape test**

Create `src/shared/data/actividades.test.ts` if it does not exist. Mock the Supabase chain and assert `actividadesRepo.list()` calls `select()` with an explicit FK embed like:
```ts
actividad_responsables!actividad_responsables_actividad_id_fkey(usuario_id, es_lider)
```
Run:
```bash
pnpm test src/shared/data/actividades.test.ts
```
Expected: FAIL until the projection is explicit.

- [ ] **Step 2: Change the repository projection**

Replace `select('*')` with an explicit projection that includes all needed activity fields plus the join rows. Keep the existing Supabase browser singleton import (`src/shared/db/supabase`) and do not create a new client.

- [ ] **Step 3: Verify load shape**

Run:
```bash
pnpm test src/shared/data/actividades.test.ts
pnpm typecheck
```
Expected: repository test PASS; typecheck failures are now limited to remaining old `responsable_id` call sites.

### Task 4: Convert non-form call sites to helpers

**Files:**
- Modify: `src/features/tasks/utils/act-filters/grupos/gente.ts`
- Modify: `src/features/tasks/utils/departamento/index.ts`
- Modify: `src/features/tasks/hooks/useTablero/index.ts`
- Modify: `src/features/admin/components/OrgCard.tsx`
- Modify: `src/features/stratix-mkt/components/roster/RosterCard/index.tsx`
- Modify: `src/features/tasks/components/solicitudes/MemberAvailabilityCard/index.tsx`
- Modify: any remaining non-form/non-report/non-Meet files from the 23-file preflight list.

- [ ] **Step 1: Extend existing failing tests**

Update tests so two-responsible tasks match both users:
```bash
pnpm test src/features/tasks/utils/act-filters/index.test.ts src/features/tasks/utils/departamento/index.test.ts src/features/tasks/utils/availability/index.test.ts
```
Expected before implementation: FAIL where only `responsable_id` is checked.

- [ ] **Step 2: Replace direct reads**

Use `esResponsable(act, userId)` for membership/counts and `responsablePrincipal(act, usuarios)` only for display. Do not translate old Spanish identifiers while touching unrelated code.

- [ ] **Step 3: Verify**

Run:
```bash
pnpm test src/features/tasks/utils/act-filters/index.test.ts src/features/tasks/utils/departamento/index.test.ts src/features/tasks/utils/availability/index.test.ts
pnpm typecheck
```
Expected: listed tests PASS; typecheck no longer reports these files.

### Task 5: Form checklist and monochrome Crown toggle

**Files:**
- Modify: `src/features/tasks/components/modals/ActivityAsignacion/index.tsx`
- Modify: `src/features/tasks/hooks/useActividadForm/index.ts`
- Modify: `src/features/tasks/hooks/useActividadForm/payload.ts`
- Modify: `src/features/tasks/utils/act-form.ts`
- Create: `src/features/tasks/hooks/useActividadForm/responsables.ts`
- Create: `src/features/tasks/hooks/useActividadForm/responsables.test.ts`
- Modify: `src/shared/i18n/locales/es.json`
- Modify: `src/shared/i18n/locales/en.json`

- [ ] **Step 1: Write failing pure toggle tests**

Cases:
- checking a user adds them with no leader by default;
- crown click sets that user as sole leader;
- crown click on active leader unsets leadership;
- unchecking the leader clears leadership;
- unchecked rows cannot be leaders.

Run:
```bash
pnpm test src/features/tasks/hooks/useActividadForm/responsables.test.ts
```
Expected: FAIL because helper module does not exist.

- [ ] **Step 2: Implement pure toggle helpers**

Create `src/features/tasks/hooks/useActividadForm/responsables.ts` with these exact exported contracts:
```ts
import type { ActividadResponsable } from '../../types'

export function toggleResponsable(rows: ActividadResponsable[], usuarioId: string, checked: boolean): ActividadResponsable[] {
  const exists = rows.some(r => r.usuario_id === usuarioId)
  if (checked && !exists) return [...rows, { usuario_id: usuarioId, es_lider: false }]
  if (checked) return rows
  return rows.filter(r => r.usuario_id !== usuarioId)
}

export function toggleLeader(rows: ActividadResponsable[], usuarioId: string): ActividadResponsable[] {
  const target = rows.find(r => r.usuario_id === usuarioId)
  if (!target) return rows
  const nextLeader = !target.es_lider
  return rows.map(r => ({ ...r, es_lider: r.usuario_id === usuarioId ? nextLeader : false }))
}

export function responsableIds(rows: ActividadResponsable[]): string[] {
  return [...new Set(rows.map(r => r.usuario_id))]
}

export function leaderId(rows: ActividadResponsable[]): string | null {
  return rows.find(r => r.es_lider)?.usuario_id ?? null
}

export function newlyAddedResponsableIds(
  previous: ActividadResponsable[],
  next: ActividadResponsable[],
  actorId: string | null | undefined,
): string[] {
  const before = new Set(previous.map(r => r.usuario_id))
  return responsableIds(next).filter(id => id !== actorId && !before.has(id))
}
```

- [ ] **Step 3: Convert form state and payload tests**

Update `NuevaActForm` from `responsable_id: string` to `responsables: ActividadResponsable[]`; remove the create-time “assignee required” validation because zero responsibles is now valid by design. Update `payload*.test.ts` to expect no `responsable_id` column in activity insert/update payloads.

Run:
```bash
pnpm test src/features/tasks/hooks/useActividadForm/responsables.test.ts src/features/tasks/hooks/useActividadForm/payload.test.ts src/features/tasks/hooks/useActividadForm/payload-alta.test.ts src/features/tasks/utils/act-form.test.ts
```
Expected: FAIL until code is updated, then PASS.

- [ ] **Step 4: Implement checklist UI**

In `ActivityAsignacion`, replace the single select with a searchable checklist from the existing `deriveMiembrosAsignables` source. Each checked row has a lucide-react `<Crown />` button:
- import `Crown` from `lucide-react`;
- use current text color (`currentColor`), no emoji and no gold color;
- button has `aria-label={t('tasks.responsibles.leaderToggleAria', { name })}`;
- button has `aria-pressed={isLeader}`;
- use i18n keys in both JSON files.

- [ ] **Step 5: Verify form and i18n**

Run:
```bash
pnpm test src/features/tasks/hooks/useActividadForm/responsables.test.ts src/features/tasks/hooks/useActividadForm/payload.test.ts src/features/tasks/hooks/useActividadForm/payload-alta.test.ts src/features/tasks/utils/act-form.test.ts src/shared/i18n/__tests__/constants.test.ts
pnpm lint:css
pnpm typecheck
```
Expected: PASS; no `i18n-ignore`, no `any`. If `ActivityAsignacion/index.tsx` exceeds repo file-length ceilings, extract `ResponsableChecklistRow` and `ResponsablesSearchBox` next to it before rerunning the gates.

### Task 6: Notifications on create and edit

**Files:**
- Modify: `src/features/tasks/hooks/useActividadForm/index.ts:82-114` and edit-save branch in same file
- Modify/create tests near `src/features/tasks/hooks/useActividadForm/`

- [ ] **Step 1: Write failing notification diff tests**

Test pure function and hook cases:
- `newlyAddedResponsableIds([], [A, B, C], A)` returns `[B, C]`;
- `newlyAddedResponsableIds([A, B], [B, C], B)` returns `[C]`;
- removed users are not notified;
- notification insert error is shown through `common.errorWithDetail` and keeps the form open.

Run:
```bash
pnpm test src/features/tasks/hooks/useActividadForm/responsables.test.ts
```
Expected: FAIL until diff/build helper exists.

- [ ] **Step 2: Implement batched inserts**

After activity create/update and successful `set_actividad_responsables`, insert `tarea_asignada` notifications in a single batch. Skip creator/editor. If insert fails, show `common.errorWithDetail` and keep form state instead of swallowing.

- [ ] **Step 3: Verify**

Run:
```bash
pnpm test src/features/tasks/hooks/useActividadForm/responsables.test.ts
pnpm typecheck
```
Expected: PASS; `useActividadForm/index.ts` no longer inserts one notification at old lines `111-113`.

### Task 7: Compact/detail displays with Crown

**Files:**
- Modify: `src/features/tasks/components/kanban/KanbanTaskCard/index.tsx`
- Modify: `src/features/tasks/components/gantt/GanttBar/index.tsx`
- Modify: `src/features/tasks/components/solicitudes/TaskTableRow/index.tsx`
- Modify: `src/features/tasks/components/overview/RecentActivityRow/index.tsx`
- Modify: `src/features/tasks/utils/act-detail-fields/grupos/asignacion.ts`
- Modify: `src/features/tasks/utils/act-detail-fields/index.test.ts`
- Modify: `src/features/tasks/utils/act-tarjeta/index.test.ts`

- [ ] **Step 1: Write/extend failing display tests**

Run:
```bash
pnpm test src/features/tasks/utils/act-detail-fields/index.test.ts src/features/tasks/utils/act-tarjeta/index.test.ts
```
Expected: FAIL until compact label/detail fields support multiple responsibles.

- [ ] **Step 2: Implement shared display helpers and UI**

Use helper output so every compact display follows the same rule:
- leader: Crown + `Ana Bravo +2`;
- no leader: `Ana Bravo +2`, first name alphabetically;
- nobody: `—`.
Render detail view with all names and crown for leader. Keep Crown monochrome/currentColor.

- [ ] **Step 3: Verify**

Run:
```bash
pnpm test src/features/tasks/utils/act-detail-fields/index.test.ts src/features/tasks/utils/act-tarjeta/index.test.ts
pnpm lint
pnpm typecheck
```
Expected: PASS.

### Task 8: Meet API backward compatibility

**Files:**
- Modify: `src/app/api/integrations/meet/_shared/contracts.ts`
- Modify: `src/app/api/integrations/meet/_shared/task-service.ts`
- Modify: `src/app/api/integrations/meet/_shared/contracts.test.ts`
- Modify: `src/app/api/integrations/meet/_shared/task-service.test.ts`
- Modify: `src/app/api/integrations/meet/tasks/route.test.ts`
- Modify: `src/app/api/integrations/meet/tasks/[activityId]/route.test.ts`.

- [ ] **Step 1: Write failing contract tests**

Cases:
- create accepts legacy `responsable_id`;
- create accepts new `responsable_ids: uuid[]`;
- update accepts either single or array;
- response keeps `responsable_id` as principal and adds `responsables` array.

Run:
```bash
pnpm test src/app/api/integrations/meet/_shared/contracts.test.ts src/app/api/integrations/meet/_shared/task-service.test.ts src/app/api/integrations/meet/tasks/route.test.ts
```
Expected: FAIL until contracts/service mapping changes.

- [ ] **Step 2: Implement mapping in shared service**

Keep routes thin; `route.ts` files should export HTTP handlers only. In service code:
- normalize input to `responsableIds` plus optional leader;
- validate every assignee;
- call the revised RPC;
- projection embeds `actividad_responsables!actividad_responsables_actividad_id_fkey(usuario_id, es_lider, usuarios!actividad_responsables_usuario_id_fkey(...))`;
- canonical response uses `responsablePrincipal` for legacy `responsable_id`.

- [ ] **Step 3: Verify and notify owner**

Run:
```bash
pnpm test src/app/api/integrations/meet/_shared/contracts.test.ts src/app/api/integrations/meet/_shared/task-service.test.ts src/app/api/integrations/meet/tasks/route.test.ts src/app/api/integrations/meet/tasks/[activityId]/route.test.ts
pnpm typecheck
```
Expected: PASS. Add a rollout note: Meet integration owner must be notified before deploy because responses gain `responsables[]` and requests may start sending arrays.

### Task 9: Reports and payroll semantics

**Files:**
- Modify: `src/features/tasks/report-filter.ts`
- Modify: `src/features/tasks/report-filter.test.ts`
- Modify: `src/features/tasks/utils/report-html/index.ts`
- Modify: `src/features/tasks/utils/report-html/index.test.ts`
- Modify: `src/features/tasks/components/reporte/ReporteTab/index.tsx`

- [ ] **Step 1: Write failing report tests**

Cases:
- a task with responsibles A and B appears on A's sheet and B's sheet;
- `totalesProduccion` gives the full hours/days to each responsible;
- requester/solicitante matching behavior remains unchanged;
- printed sheet lists all responsible names in the column.

Run:
```bash
pnpm test src/features/tasks/report-filter.test.ts src/features/tasks/utils/report-html/index.test.ts
```
Expected: FAIL until report code uses `esResponsable` and prints all names.

- [ ] **Step 2: Implement report changes**

Replace `act.responsable_id === idMiembro` with `esResponsable(act, idMiembro)`. Build printed names from all `responsables`, sorted consistently with the helper.

- [ ] **Step 3: Verify**

Run:
```bash
pnpm test src/features/tasks/report-filter.test.ts src/features/tasks/utils/report-html/index.test.ts
pnpm typecheck
```
Expected: PASS.

### Task 10: Remove remaining legacy reads and API/admin delete route dependency

**Files:**
- Modify: any file still returned by the preflight grep, especially `src/app/api/admin/delete-user/route.ts`.

- [ ] **Step 1: Prove remaining failures**

Run:
```bash
grep -RInE 'responsable_id' src --include='*.ts' --include='*.tsx'
pnpm typecheck
```
Expected before cleanup: only intentional Meet compatibility fields and tests should remain. Any application model reads outside compatibility are failures.

- [ ] **Step 2: Cleanup**

Update admin delete route and other leftovers to rely on DB RPC behavior and the join table. Keep legacy `responsable_id` only in Meet request/response contracts/tests where backward compatibility requires it.

- [ ] **Step 3: Verify**

Run:
```bash
grep -RInE 'responsable_id' src --include='*.ts' --include='*.tsx'
pnpm typecheck
```
Expected: grep output is limited to Meet backward-compatibility contract/service/tests and explicit comments documenting compatibility. Typecheck PASS.

### Task 11: End-to-end coverage

**Files:**
- Create: `e2e/tasks-multi-responsables.spec.ts`
- Do not modify shared E2E helpers for this task; write the scenario directly in `e2e/tasks-multi-responsables.spec.ts`.

- [ ] **Step 1: Write failing E2E**

Scenario:
1. login as a non-admin user with Tasks permission;
2. create a task with three people and mark one leader;
3. verify card shows Crown + leader name + `+2`;
4. open Report tab and verify the task appears for all three responsibles.

Run:
```bash
pnpm e2e e2e/tasks-multi-responsables.spec.ts
```
Expected before full UI implementation: FAIL at checklist/crown/card/report assertions.

- [ ] **Step 2: Make E2E pass with minimal selectors**

Prefer accessible selectors (`getByRole`, labels from `useT()` keys). Do not add test-only IDs unless accessible selectors are unstable.

- [ ] **Step 3: Verify E2E**

Run:
```bash
pnpm e2e e2e/tasks-multi-responsables.spec.ts
```
Expected: PASS locally.

### Task 12: Full gates and Centinela sweep

**Files:**
- No product files unless gates expose issues.

- [ ] **Step 1: Run unit and static gates**

Run:
```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm lint:css
pnpm rules:check
pnpm rules:sweep
pnpm db:rls
```
Expected: all PASS. If Centinela blocks an edit, read the rule reason and change the content; do not bypass hooks or invent exemptions.

- [ ] **Step 2: Run E2E gate**

Run:
```bash
pnpm e2e
```
Expected: PASS.

- [ ] **Step 3: Confirm no forbidden commands or accidental commits**

Run:
```bash
git status --short
git log --oneline -3
```
Expected: working tree shows intended changes only; no new commit exists unless the user explicitly asked for one after this plan.

### Task 13: Production rollout checklist

**Files:**
- Release notes / PR description only.

- [ ] **Step 1: Local pre-prod checklist**

Confirm:
- local `pnpm supabase migration up` has passed;
- all gates from Task 12 pass;
- Meet integration owner has deploy notice;
- migration file is included in the PR and lands before frontend merge.

- [ ] **Step 2: Backup and production precheck**

Before touching linked production, take a database backup using the team's normal Supabase backup procedure. Then run read-only prechecks against linked project: current row counts, `actividades.responsable_id` non-null count, duplicate-risk checks, module slug existence, RLS status.

- [ ] **Step 3: Check linked migration state before push**

Run:
```bash
pnpm supabase migration list --linked
```
Expected: linked project is in the expected migration state; no unapplied remote drift is present.

- [ ] **Step 4: Apply production migration before merge**

Run only after backup/precheck approval:
```bash
pnpm supabase db push
```
Expected: production has `actividad_responsables`, old column is gone, views/RPCs work, anon blocked, non-admin module user verified. The migration lands before merging/deploying frontend code because the new code requires the table.

- [ ] **Step 5: Post-push smoke**

Verify in production or staging:
- existing tasks show their former assignee as the only responsible;
- creating unassigned task works;
- creating multi-responsible task works;
- Report tab includes full task on every responsible's sheet;
- Meet legacy request with `responsable_id` still works.

## Open questions / reviewer decisions

None before implementation. The earlier ambiguities are resolved in the **Completion audit** section: zero responsibles is intentional new behavior, workload views must be recreated with `security_invoker = true`, and responsibility changes are audited through a join-table trigger instead of `log_reunion()`.
