# Tasks Weekly Availability — Delivery 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the synthetic Tasks availability screen with persisted per-user recurring weekly ranges, multiple ranges per day, optional range notes, daily `jornada.horas_dia` comparison, self-edit-only authorization, team-scoped reads, and administrator read-all access.

**Architecture:** Store normalized recurring ranges in PostgreSQL, enforce overlap and ownership at the database boundary, and expose one lazy-loaded Tasks availability API. Keep time calculations in pure TypeScript utilities, render persisted schedules in a truthful team view, and allow the authenticated user to replace only their own schedule through one transactional RPC.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase/PostgreSQL, PostgreSQL RLS and RPCs, Zod, Vitest, Testing Library, Playwright, CSS Modules, project i18n.

**Approved specification:** `docs/superpowers/specs/2026-10-09-task-availability-design.md`

---

## Scope Guard

This plan implements **Delivery 1 only**.

Included:

- recurring weekly availability owned by a user;
- ISO weekdays `1..7`, Monday through Sunday;
- zero, one, or multiple ranges per day;
- optional note per range, limited to 280 characters;
- per-day comparison against active `jornada.horas_dia`;
- weekly declared total as informational data only;
- non-blocking below/above-day warnings;
- self-edit only, including for administrators;
- same-team read access for regular users;
- read-all for administrators, restricted to active users with Tasks access;
- self-only read/edit for an active Tasks user whose team is missing;
- explicit missing-schedule and missing/inactive-jornada states.

Excluded:

- dated exceptions or alternating weeks;
- schedule history;
- approval of availability changes;
- carryover or hour balances;
- actual hours, clock-in/out, or task timers;
- meetings, live presence, or current-task overlays;
- weekly targets derived from `horas_dia × 5`;
- administrator editing of another user's schedule.

## Review Workload Forecast

Expected change: approximately **900–1,400 changed lines** across SQL, API, domain utilities, UI, translations, and tests. This is above the repository's 400-line review comfort threshold.

Recommended delivery as two chained PRs:

1. **PR A — Data and authorization:** Tasks 1–3. Pure time domain, migration/RLS/RPC, and API/data client.
2. **PR B — User experience:** Tasks 4–7. Truthful read view, self-editor, tab/i18n integration, and final E2E coverage.

Every commit below is a reviewable work unit and keeps its tests with the behavior it introduces.

## File Responsibility Map

### New files

- `docs/superpowers/ui-references/2026-10-21-task-availability-references.md` — bounded Mobbin reference review completed before UI implementation.
- `supabase/migrations/20261021010000_task_weekly_availability.sql` — table, constraints, indexes, visibility helper, RLS policies, read RPC, and atomic replace-own RPC.
- `e2e/task-availability-rls.spec.ts` — direct database authorization and constraint coverage.
- `src/features/tasks/data/availability/types.ts` — transport contracts shared by the API and client.
- `src/features/tasks/data/availability/index.ts` — browser fetch/save adapter.
- `src/features/tasks/data/availability/index.test.ts` — adapter success and error behavior.
- `src/app/api/tasks/availability/route.ts` — authenticated lazy GET and self-only PUT endpoint.
- `src/app/api/tasks/availability/route.test.ts` — route validation and authorization tests.
- `src/features/tasks/components/solicitudes/MemberAvailabilityCard/index.test.tsx` — truthful persisted schedule rendering tests.
- `src/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/index.tsx` — seven-day self-editor.
- `src/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/index.module.css` — responsive editor styles.
- `src/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/index.test.tsx` — editor interaction and accessibility tests.
- `e2e/task-availability.spec.ts` — complete browser journey.

### Modified files

- `src/shared/data/tables.ts` — register the new table name if client code references it directly.
- `src/features/tasks/utils/availability/index.ts` — replace synthetic slot/capacity logic with pure recurring-range calculations.
- `src/features/tasks/utils/availability/index.test.ts` — replace synthetic workload tests with recurring-range tests.
- `src/features/tasks/components/solicitudes/SolicitudesTab/index.tsx` — make Availability visible to every Tasks user.
- `src/features/tasks/components/solicitudes/SolicitudesAvailabilityView/index.tsx` — lazy load one visible-team payload and coordinate read/edit states.
- `src/features/tasks/components/solicitudes/SolicitudesAvailabilityView/index.module.css` — responsive list/grid and state styling.
- `src/features/tasks/components/solicitudes/MemberAvailabilityCard/index.tsx` — render persisted ranges and daily comparisons.
- `src/features/tasks/components/solicitudes/MemberAvailabilityCard/index.module.css` — replace synthetic capacity styling with semantic schedule styling.
- `src/shared/i18n/locales/es.json` — Spanish Availability copy.
- `src/shared/i18n/locales/en.json` — matching English keys.
- `e2e/seed.ts` — team/jornada assignment helpers and availability cleanup.

### Files to delete only after import verification

- `src/features/tasks/components/solicitudes/HourSlot/index.tsx`
- `src/features/tasks/components/solicitudes/HourSlot/index.module.css`
- `src/features/tasks/components/solicitudes/ActiveTaskLine/index.tsx`
- `src/features/tasks/components/solicitudes/ActiveTaskLine/index.module.css`

Before deleting, run:

```bash
rg -n "HourSlot|ActiveTaskLine|slotOcupado|HORAS_SEMANALES|cargaDe" src
```

Delete only symbols/files with no consumer outside the synthetic Availability path.

---

### Task 0: Review Real Scheduling Interfaces through Mobbin MCP

**Files:**
- Create: `docs/superpowers/ui-references/2026-10-21-task-availability-references.md`
- Read: `docs/superpowers/specs/2026-10-09-task-availability-design.md`
- Read: `.interface-design/system.md` if it exists when implementation begins

This is a bounded reference pass, not an additional product-design phase. It must not expand Delivery 1.

**Status (audited 2026-10-30):** Done. `docs/superpowers/ui-references/2026-10-21-task-availability-references.md`
exists with every required heading (`Delivery 1 constraints`, `Search queries`, `Selected
references`, `Patterns worth adapting`, `Patterns explicitly rejected`, `Resulting implementation
guidance`), plus two extra sections (`Resolved UI ambiguities`, `shadcn/ui component check`) added
by later commits (`3b4255ae`, `782244e4`). It carries 12 references, not the "five maximum" Step 5
asks for — a real deviation from the plan's own skimmability guidance, not a missing deliverable.

- [x] **Step 1: Confirm Mobbin is connected in Pi**

Run `/mcp` or inspect the `mobbin` server. Confirm the six Mobbin tools are available before spending implementation time:

```text
mobbin_search_screens
mobbin_search_flows
mobbin_search_sections
mobbin_read_mobbin_screen_search_results
mobbin_read_mobbin_flow_search_results
mobbin_read_mobbin_section_search_results
```

If authentication has expired, reconnect `mobbin` and complete OAuth. Do not place credentials in the repository.

- [x] **Step 2: Run three narrow screen searches**

Search desktop/web references in three distinct angles rather than one broad query:

```text
1. Workforce scheduling interfaces where an employee edits recurring weekly availability.
2. Weekly schedule editors that support multiple time ranges or split shifts on the same day.
3. Team availability views that show working ranges, range notes, and read-only coworkers.
```

Request no more than 12 results per search. Prefer shipped workforce, calendar, staff-planning, and collaborative productivity products. Do not search marketing landing pages.

- [x] **Step 3: Select five useful references**

For each selected reference, record:

```markdown
### Product — screen or flow name

- Mobbin URL:
- Platform and captured state:
- Visible pattern:
- Why it helps this Delivery 1 problem:
- What to adopt conceptually:
- What to reject or avoid:
- Accessibility concern to verify independently:
```

A Mobbin example proves that a product used a pattern; it does not prove that the pattern improved usability. Do not copy branding, text, assets, or an entire composition.

- [x] **Step 4: Write the bounded reference brief**

Create `docs/superpowers/ui-references/2026-10-21-task-availability-references.md` with:

```markdown
# Tasks Weekly Availability — UI Reference Brief

## Delivery 1 constraints

## Search queries

## Selected references

## Patterns worth adapting

## Patterns explicitly rejected

## Resulting implementation guidance
```

The resulting guidance must stay inside the approved scope:

- seven-day recurring editor;
- multiple ranges per day;
- optional note per range;
- daily jornada comparison;
- weekly declared total only;
- self-edit only;
- teammate/admin read-only cards;
- no live state, task overlays, approvals, exceptions, or balances.

- [x] **Step 5: Review the brief from a smartphone-friendly perspective** (reference count exceeds the stated cap — see Status above)

Keep the brief skimmable:

- five references maximum;
- one screenshot/link and a short observation per reference;
- a compact adopt/reject summary;
- no pasted gallery dumps;
- no large unfiltered MCP output committed to Git.

- [x] **Step 6: Commit the research work unit**

```bash
git add docs/superpowers/ui-references/2026-10-21-task-availability-references.md
git commit -m "docs(tasks): capture availability UI references"
```

---

### Task 1: Replace Synthetic Availability Math with a Pure Recurring-Range Domain

**Files:**
- Modify: `src/features/tasks/utils/availability/index.ts`
- Modify: `src/features/tasks/utils/availability/index.test.ts`

**Status (audited 2026-10-30):** Done. The domain was split one-function-per-file (repo
convention) under `src/features/tasks/utils/availability/{duration-hours,sort-ranges,
validate-ranges,declared-hours-by-day,declared-weekly-hours,compare-daily-hours,has-overlap}/`,
each with its own test, plus `index.ts` as a pure re-export barrel and `types.ts` for the shared
types. Every public contract named in the plan (`durationHours`, `sortRanges`, `validateRanges`,
`declaredHoursByDay`, `declaredWeeklyHours`, `compareDailyHours`, `Weekday`,
`WeeklyAvailabilityRange`) exists with the exact signatures specified, verified by reading
`index.ts` and `types.ts` directly. All Step 4 boundary cases are present, just distributed across
the per-function test files instead of the central one: `00:00–00:30`/`23:00–23:59` in
`duration-hours/index.test.ts:15-16`, Sunday ordering in `sort-ranges/index.test.ts`, and
reverse-order touching ranges in `validate-ranges/index.test.ts` ("allows two touching ranges even
when the later one comes first in the input"). `pnpm test` (full suite, 2315/2315) and
`pnpm typecheck` both pass.

- [x] **Step 1: Replace the synthetic tests with failing recurring-range tests**

Write tests around these public contracts:

```ts
import { describe, expect, it } from 'vitest'
import {
  compareDailyHours,
  declaredHoursByDay,
  declaredWeeklyHours,
  durationHours,
  sortRanges,
  validateRanges,
  type WeeklyAvailabilityRange,
} from '.'

const range = (
  weekday: WeeklyAvailabilityRange['weekday'],
  startsAt: string,
  endsAt: string,
  note: string | null = null,
): WeeklyAvailabilityRange => ({ weekday, startsAt, endsAt, note })

describe('weekly availability domain', () => {
  it('calculates duration from canonical HH:mm values', () => {
    expect(durationHours(range(1, '09:00', '13:30'))).toBe(4.5)
  })

  it('adds multiple ranges on the same day and reports the weekly declared total', () => {
    const ranges = [
      range(1, '09:00', '13:00'),
      range(1, '14:00', '18:00', 'Not available for meetings'),
      range(2, '11:00', '15:00'),
    ]

    expect(declaredHoursByDay(ranges)).toEqual({ 1: 8, 2: 4 })
    expect(declaredWeeklyHours(ranges)).toBe(12)
  })

  it('sorts by weekday and start time without mutating the input', () => {
    const ranges = [range(2, '14:00', '18:00'), range(1, '09:00', '13:00')]
    expect(sortRanges(ranges).map(item => item.weekday)).toEqual([1, 2])
    expect(ranges[0]?.weekday).toBe(2)
  })

  it('rejects overlaps but allows touching ranges', () => {
    expect(validateRanges([
      range(1, '09:00', '13:00'),
      range(1, '12:30', '14:00'),
    ])).toContainEqual({ code: 'overlap', rangeIndex: 1, conflictingRangeIndex: 0 })

    expect(validateRanges([
      range(1, '09:00', '13:00'),
      range(1, '13:00', '17:00'),
    ])).toEqual([])
  })

  it('rejects malformed, zero-duration, and reversed ranges', () => {
    expect(validateRanges([range(1, 'nine', '13:00')])[0]?.code).toBe('invalid-time')
    expect(validateRanges([range(1, '09:00', '09:00')])[0]?.code).toBe('end-not-after-start')
    expect(validateRanges([range(1, '10:00', '09:00')])[0]?.code).toBe('end-not-after-start')
  })

  it('ignores notes when calculating hours', () => {
    expect(durationHours(range(1, '09:00', '13:00', 'Class in the afternoon'))).toBe(4)
  })

  it('compares only a declared day with the daily jornada reference', () => {
    expect(compareDailyHours(6, 8)).toEqual({
      declaredHours: 6,
      expectedHours: 8,
      differenceHours: -2,
      status: 'below',
    })
    expect(compareDailyHours(8, 8).status).toBe('complete')
    expect(compareDailyHours(10, 8).status).toBe('above')
    expect(compareDailyHours(6, null).status).toBe('unavailable')
  })
})
```

- [x] **Step 2: Run the focused test and confirm RED**

Run:

```bash
pnpm test -- src/features/tasks/utils/availability/index.test.ts
```

Expected: FAIL because the recurring-range types/functions do not exist yet.

- [x] **Step 3: Implement minute-based pure functions**

Replace the synthetic 40-hour/slot API with:

```ts
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type WeeklyAvailabilityRange = {
  id?: string
  weekday: Weekday
  startsAt: string
  endsAt: string
  note?: string | null
}

export type RangeValidationError =
  | { code: 'invalid-time'; rangeIndex: number }
  | { code: 'end-not-after-start'; rangeIndex: number }
  | { code: 'overlap'; rangeIndex: number; conflictingRangeIndex: number }

export type DailyHoursComparison = {
  declaredHours: number
  expectedHours: number | null
  differenceHours: number | null
  status: 'below' | 'complete' | 'above' | 'unavailable'
}

const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/

const minutes = (value: string): number | null => {
  if (!TIME.test(value)) return null
  const [hours, mins] = value.split(':').map(Number)
  return hours * 60 + mins
}

export function durationHours(range: WeeklyAvailabilityRange): number {
  const start = minutes(range.startsAt)
  const end = minutes(range.endsAt)
  if (start === null || end === null || end <= start) return 0
  return (end - start) / 60
}

export function sortRanges(ranges: WeeklyAvailabilityRange[]): WeeklyAvailabilityRange[] {
  return [...ranges].sort((a, b) =>
    a.weekday - b.weekday || a.startsAt.localeCompare(b.startsAt),
  )
}

export function validateRanges(ranges: WeeklyAvailabilityRange[]): RangeValidationError[] {
  const errors: RangeValidationError[] = []
  const parsed = ranges.map((item, rangeIndex) => ({
    item,
    rangeIndex,
    start: minutes(item.startsAt),
    end: minutes(item.endsAt),
  }))

  parsed.forEach(({ rangeIndex, start, end }) => {
    if (start === null || end === null) errors.push({ code: 'invalid-time', rangeIndex })
    else if (end <= start) errors.push({ code: 'end-not-after-start', rangeIndex })
  })

  const valid = parsed.filter(
    (item): item is typeof item & { start: number; end: number } =>
      item.start !== null && item.end !== null && item.end > item.start,
  )

  for (let left = 0; left < valid.length; left += 1) {
    for (let right = left + 1; right < valid.length; right += 1) {
      const a = valid[left]
      const b = valid[right]
      if (a.item.weekday !== b.item.weekday) continue
      if (a.start < b.end && b.start < a.end) {
        errors.push({
          code: 'overlap',
          rangeIndex: Math.max(a.rangeIndex, b.rangeIndex),
          conflictingRangeIndex: Math.min(a.rangeIndex, b.rangeIndex),
        })
      }
    }
  }

  return errors
}

export function declaredHoursByDay(
  ranges: WeeklyAvailabilityRange[],
): Partial<Record<Weekday, number>> {
  return ranges.reduce<Partial<Record<Weekday, number>>>((totals, item) => {
    totals[item.weekday] = (totals[item.weekday] ?? 0) + durationHours(item)
    return totals
  }, {})
}

export function declaredWeeklyHours(ranges: WeeklyAvailabilityRange[]): number {
  return Object.values(declaredHoursByDay(ranges)).reduce((sum, hours) => sum + (hours ?? 0), 0)
}

export function compareDailyHours(
  declaredHours: number,
  expectedHours: number | null,
): DailyHoursComparison {
  if (expectedHours === null) {
    return { declaredHours, expectedHours, differenceHours: null, status: 'unavailable' }
  }
  const differenceHours = declaredHours - expectedHours
  const status = differenceHours < 0 ? 'below' : differenceHours > 0 ? 'above' : 'complete'
  return { declaredHours, expectedHours, differenceHours, status }
}
```

Do not add a weekly expected-hours function.

- [x] **Step 4: Run GREEN and triangulate boundary cases**

Run:

```bash
pnpm test -- src/features/tasks/utils/availability/index.test.ts
```

Expected: PASS.

Add explicit tests for `00:00–00:30`, `23:00–23:59`, Sunday, and two touching ranges in reverse input order. Run the same command and keep it GREEN.

- [x] **Step 5: Commit the domain work unit**

```bash
git add src/features/tasks/utils/availability/index.ts \
  src/features/tasks/utils/availability/index.test.ts
git commit -m "feat(tasks): define recurring availability domain"
```

---

### Task 2: Add the Availability Table, Atomic Replacement, and RLS

**Files:**
- Create: `supabase/migrations/20261021010000_task_weekly_availability.sql`
- Create: `e2e/task-availability-rls.spec.ts`
- Modify: `e2e/seed.ts`
- Modify: `src/shared/data/tables.ts`

**Status (audited 2026-10-30):** Done, and extended by a later fix migration. The table, RLS
policies, `replace_own_weekly_availability`, and `get_visible_weekly_availability` all exist
exactly as specified in
`supabase/migrations/20261021010000_task_weekly_availability.sql`. A second migration,
`supabase/migrations/20261030001822_fix_admin_own_weekly_availability.sql` (not in the original
plan), widens `can_read_weekly_availability`'s owner-side check with `owner.rol = 'admin'`
because admin carries no `role_modules` rows by design (per CLAUDE.md), which silently hid an
admin's own row from themselves. `src/shared/data/tables.ts:36` registers
`weeklyAvailabilityRanges: 'user_weekly_availability_ranges'`. The Step 1 fixtures were not added
to `e2e/seed.ts` in place; they live as separate one-function-per-file modules in
`e2e/availability-seed/` (`assign-organization.ts`, `clear-weekly-availability.ts`,
`first-departamento-id.ts`) per this repo's file-size convention — a deliberate deviation from the
plan's literal file list, not a gap. `e2e/task-availability-rls/index.spec.ts` covers every case
Step 2 lists, plus the admin-self-read case the fix migration exists for. Ran live against the
local stack: all 8 tests pass (`pnpm exec playwright test e2e/task-availability-rls` → 8 passed).
`pnpm db:rls` passes clean. `pnpm db:migraciones-fresca` fails, but on an unrelated, pre-existing
migration from `main` (`20261019120000_native_sales_membership_archive.sql`, referencing
`storage.buckets`, which the disposable bare-Postgres image this check uses doesn't provision) —
confirmed via `git log main -- <that file>`; it aborts before ever reaching either availability
migration, so it is not evidence against this task.

- [x] **Step 1: Extend E2E fixtures for team, jornada, and cleanup**

Add focused helpers to `e2e/seed.ts` rather than changing unrelated fixture defaults:

```ts
export async function assignOrganization(
  userId: string,
  values: { equipoId: string | null; jornadaId: string | null },
) {
  const { error } = await admin
    .from('usuarios')
    .update({ equipo_id: values.equipoId, jornada_id: values.jornadaId })
    .eq('id', userId)
  if (error) throw error
}

export async function clearWeeklyAvailability(userIds: string[]) {
  const { error } = await admin
    .from('user_weekly_availability_ranges')
    .delete()
    .in('user_id', userIds)
  if (error && error.code !== '42P01') throw error
}
```

Keep test-created users, teams, and jornadas deterministic and clean them in `afterAll`/`afterEach` following existing E2E fixture conventions.

- [x] **Step 2: Write failing direct-RLS tests**

Create `e2e/task-availability-rls.spec.ts` with these identities:

- owner and teammate: same non-null `equipo_id`, Tasks module;
- outsider: different team, Tasks module;
- teamless: null team, Tasks module;
- administrator: active admin;
- no-module user: active but without Tasks.

Use authenticated PostgREST helpers from `e2e/rest.ts`. Assert:

```ts
await expect(ownerDb.from(TABLE).insert(ownerRange)).resolves.toMatchObject({ error: null })
expect((await teammateDb.from(TABLE).select('*').eq('user_id', ownerId)).data).toHaveLength(1)
expect((await outsiderDb.from(TABLE).select('*').eq('user_id', ownerId)).data).toEqual([])
expect((await teamlessDb.from(TABLE).select('*').neq('user_id', teamlessId)).data).toEqual([])
expect((await adminDb.from(TABLE).select('*').eq('user_id', ownerId)).data).toHaveLength(1)
expect((await adminDb.from(TABLE).update({ note: 'changed' }).eq('user_id', ownerId)).error).not.toBeNull()
expect((await teammateDb.from(TABLE).delete().eq('user_id', ownerId)).error).not.toBeNull()
expect((await noModuleDb.from(TABLE).select('*')).toMatchObject({ data: [] })
```

Also assert:

- `starts_at >= ends_at` fails;
- weekday `0` and `8` fail;
- note longer than 280 characters fails;
- overlapping same-day ranges fail;
- touching ranges succeed;
- identical clock ranges on different days succeed;
- `replace_own_weekly_availability` replaces only the caller's rows atomically;
- RPC JSON containing `user_id` is rejected as malformed rather than trusted.

- [x] **Step 3: Run the RLS spec and confirm RED**

Run:

```bash
pnpm exec playwright test e2e/task-availability-rls.spec.ts
```

Expected: FAIL because the table and RPC do not exist.

- [x] **Step 4: Create the complete migration**

Implement `supabase/migrations/20261021010000_task_weekly_availability.sql` with this structure:

```sql
BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

CREATE TABLE public.user_weekly_availability_ranges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  starts_at time NOT NULL,
  ends_at time NOT NULL,
  note text NULL CHECK (note IS NULL OR char_length(note) <= 280),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_weekly_availability_ranges_positive_duration
    CHECK (starts_at < ends_at),
  CONSTRAINT user_weekly_availability_ranges_no_overlap
    EXCLUDE USING gist (
      user_id WITH =,
      weekday WITH =,
      tsrange(
        timestamp '2000-01-01' + starts_at,
        timestamp '2000-01-01' + ends_at,
        '[)'
      ) WITH &&
    )
);

CREATE INDEX user_weekly_availability_ranges_owner_day_start_idx
  ON public.user_weekly_availability_ranges (user_id, weekday, starts_at);

ALTER TABLE public.user_weekly_availability_ranges ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_active_tasks_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT u.id
  FROM public.usuarios u
  WHERE u.auth_id = auth.uid()
    AND u.activo = true
    AND public.has_module('tasks')
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.can_read_weekly_availability(p_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH caller AS (
    SELECT u.id, u.equipo_id, u.rol
    FROM public.usuarios u
    WHERE u.auth_id = auth.uid()
      AND u.activo = true
      AND public.has_module('tasks')
    LIMIT 1
  ), owner AS (
    SELECT u.id, u.equipo_id, u.activo, u.rol
    FROM public.usuarios u
    WHERE u.id = p_owner_id
  )
  SELECT EXISTS (
    SELECT 1
    FROM caller c
    JOIN owner o ON o.activo = true
    WHERE EXISTS (
      SELECT 1
      FROM public.role_modules rm
      WHERE rm.role_key = o.rol
        AND rm.module_slug = 'tasks'
    )
      AND (
        c.id = o.id
        OR public.is_admin()
        OR (
          c.equipo_id IS NOT NULL
          AND o.equipo_id IS NOT NULL
          AND c.equipo_id = o.equipo_id
        )
      )
  )
$$;

REVOKE ALL ON FUNCTION public.current_active_tasks_user_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_read_weekly_availability(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_active_tasks_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_weekly_availability(uuid) TO authenticated;

CREATE POLICY task_availability_select
ON public.user_weekly_availability_ranges
FOR SELECT TO authenticated
USING (public.can_read_weekly_availability(user_id));

CREATE POLICY task_availability_insert_own
ON public.user_weekly_availability_ranges
FOR INSERT TO authenticated
WITH CHECK (user_id = public.current_active_tasks_user_id());

CREATE POLICY task_availability_update_own
ON public.user_weekly_availability_ranges
FOR UPDATE TO authenticated
USING (user_id = public.current_active_tasks_user_id())
WITH CHECK (user_id = public.current_active_tasks_user_id());

CREATE POLICY task_availability_delete_own
ON public.user_weekly_availability_ranges
FOR DELETE TO authenticated
USING (user_id = public.current_active_tasks_user_id());

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.user_weekly_availability_ranges TO authenticated;
```

In the same migration, add:

```sql
CREATE OR REPLACE FUNCTION public.replace_own_weekly_availability(p_ranges jsonb)
RETURNS SETOF public.user_weekly_availability_ranges
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := public.current_active_tasks_user_id();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'TASKS_ACCESS_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(p_ranges) <> 'array' THEN
    RAISE EXCEPTION 'INVALID_AVAILABILITY_RANGES' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_ranges) item
    WHERE item ? 'user_id'
       OR NOT (item ? 'weekday' AND item ? 'starts_at' AND item ? 'ends_at')
       OR (item - 'weekday' - 'starts_at' - 'ends_at' - 'note') <> '{}'::jsonb
  ) THEN
    RAISE EXCEPTION 'INVALID_AVAILABILITY_RANGE_FIELDS' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.user_weekly_availability_ranges
  WHERE user_id = v_user_id;

  INSERT INTO public.user_weekly_availability_ranges (
    user_id,
    weekday,
    starts_at,
    ends_at,
    note
  )
  SELECT
    v_user_id,
    parsed.weekday,
    parsed.starts_at,
    parsed.ends_at,
    nullif(btrim(parsed.note), '')
  FROM jsonb_to_recordset(p_ranges) AS parsed(
    weekday smallint,
    starts_at time,
    ends_at time,
    note text
  );

  RETURN QUERY
  SELECT item.*
  FROM public.user_weekly_availability_ranges item
  WHERE item.user_id = v_user_id
  ORDER BY item.weekday, item.starts_at;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_own_weekly_availability(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_own_weekly_availability(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_visible_weekly_availability()
RETURNS TABLE (
  user_id uuid,
  first_name text,
  last_name text,
  team_id uuid,
  team_name text,
  workday_id uuid,
  workday_name text,
  hours_per_day numeric,
  range_id uuid,
  weekday smallint,
  starts_at time,
  ends_at time,
  note text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH caller AS (
    SELECT u.id, u.equipo_id
    FROM public.usuarios u
    WHERE u.auth_id = auth.uid()
      AND u.activo = true
      AND public.has_module('tasks')
    LIMIT 1
  )
  SELECT
    owner.id,
    owner.nombre,
    owner.apellido,
    owner.equipo_id,
    team.nombre,
    CASE WHEN workday.activo = true THEN workday.id END,
    CASE WHEN workday.activo = true THEN workday.nombre END,
    CASE WHEN workday.activo = true THEN workday.horas_dia END,
    ranges.id,
    ranges.weekday,
    ranges.starts_at,
    ranges.ends_at,
    ranges.note
  FROM caller c
  JOIN public.usuarios owner
    ON owner.activo = true
   AND EXISTS (
     SELECT 1
     FROM public.role_modules rm
     WHERE rm.role_key = owner.rol
       AND rm.module_slug = 'tasks'
   )
   AND (
     owner.id = c.id
     OR public.is_admin()
     OR (
       c.equipo_id IS NOT NULL
       AND owner.equipo_id = c.equipo_id
     )
   )
  LEFT JOIN public.equipos team ON team.id = owner.equipo_id
  LEFT JOIN public.jornadas workday ON workday.id = owner.jornada_id
  LEFT JOIN public.user_weekly_availability_ranges ranges ON ranges.user_id = owner.id
  ORDER BY owner.nombre, owner.apellido, ranges.weekday, ranges.starts_at
$$;

REVOKE ALL ON FUNCTION public.get_visible_weekly_availability() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_visible_weekly_availability() TO authenticated;

COMMIT;
```

If the `tsrange(timestamp + time)` exclusion expression fails under the local Supabase image, keep the same `[)` semantics using a generated `int4range` of minutes. Do not drop database-level overlap protection.

Register the table in `src/shared/data/tables.ts`:

```ts
weeklyAvailabilityRanges: 'user_weekly_availability_ranges',
```

- [x] **Step 5: Validate the migration and prove GREEN** (`db:migraciones-fresca` blocked by an unrelated pre-existing migration — see Status above; `db:rls` and the RLS e2e spec both pass live)

Run:

```bash
pnpm db:migraciones-fresca
pnpm db:rls
pnpm exec playwright test e2e/task-availability-rls.spec.ts
```

Expected: all commands PASS. Confirm explicitly that admin update/delete of another owner's rows fails.

- [x] **Step 6: Commit the database work unit**

```bash
git add supabase/migrations/20261021010000_task_weekly_availability.sql \
  e2e/task-availability-rls.spec.ts \
  e2e/seed.ts \
  src/shared/data/tables.ts
git commit -m "feat(tasks): persist self-managed weekly availability"
```

---

### Task 3: Add the Lazy Availability API and Browser Adapter

**Files:**
- Create: `src/features/tasks/data/availability/types.ts`
- Create: `src/features/tasks/data/availability/index.ts`
- Create: `src/features/tasks/data/availability/index.test.ts`
- Create: `src/app/api/tasks/availability/route.ts`
- Create: `src/app/api/tasks/availability/route.test.ts`

**Status (audited 2026-10-30):** Done, and more decomposed than the plan sketched. `route.ts`
(`src/app/api/tasks/availability/route.ts`) only exports `GET`/`PUT`, delegating to
`helpers/{schema,respond,normalize}` and `repository/{authorize-viewer,respond-with-availability,
load-viewer,load-response,save-rpc}`, each its own file. `authorize-viewer/index.ts` calls
`requireModule(MODULE.TASKS)` then resolves the caller's `usuarios.id` — matching the plan's
`access.ok`/`requireModule('tasks')` guard. `helpers/schema/index.ts`'s `saveSchema` is `.strict()`
on both the range and the envelope, `weekday` is a `1`-`7` literal union (not a loose
`z.number()`), and there is structurally nowhere to put a `userId` — stronger than the plan's
sketch, not weaker. `save-rpc/index.ts` maps the exclusion-violation SQLSTATE to 409 and anything
else to 400, and calls `replace_own_weekly_availability` with only `weekday`/`starts_at`/`ends_at`/
`note`. No `supabaseAdmin()` import anywhere in this route tree (confirmed by reading every file).
`src/features/tasks/data/availability/{fetch-visible,save-own}/index.ts` match the plan's adapter
functions exactly, including the `TASK_AVAILABILITY_LOAD_FAILED`/`TASK_AVAILABILITY_SAVE_FAILED`
error strings. `route.test.ts` covers every case Step 2 lists except the three team-scoping GET
cases (same-team/teamless/admin-read-all) — those are pushed down to
`get_visible_weekly_availability()` and proven instead by the Task 2 RLS e2e spec, a reasonable
split since the route itself only serializes the RPC's rows. `pnpm typecheck` passes; the full
`pnpm test` run (2315/2315) includes this route's and the adapter's tests.

- [x] **Step 1: Define shared transport contracts**

Create `src/features/tasks/data/availability/types.ts`:

```ts
import type { Weekday } from '@/features/tasks/utils/availability'

export type AvailabilityRangeDto = {
  id: string
  weekday: Weekday
  startsAt: string
  endsAt: string
  note: string | null
}

export type AvailabilityMemberDto = {
  id: string
  name: string
  team: { id: string; name: string } | null
  workday: { id: string; name: string; hoursPerDay: number } | null
  ranges: AvailabilityRangeDto[]
  canEdit: boolean
}

export type AvailabilityResponse = {
  viewerUserId: string
  members: AvailabilityMemberDto[]
}

export type SaveOwnAvailabilityRequest = {
  ranges: Array<{
    weekday: Weekday
    startsAt: string
    endsAt: string
    note?: string | null
  }>
}
```

- [x] **Step 2: Write failing route tests**

Follow the mock pattern in `src/app/api/tasks/calendar/route.test.ts` and `src/app/api/tasks/save/route.ts`.

Cover:

- `requireModule('tasks')` denial;
- inactive/missing application profile;
- GET returns `Cache-Control: no-store`;
- GET returns same-team members for a regular user;
- GET returns self only for a teamless regular user;
- GET returns active Tasks users for an admin;
- inactive jornada serializes as `workday: null`;
- ranges serialize as canonical `HH:mm` strings;
- PUT rejects a body without `ranges`;
- PUT rejects invalid weekday/time/note length;
- PUT rejects overlaps before calling the RPC;
- PUT never accepts or forwards a target user ID;
- PUT calls `replace_own_weekly_availability` with only normalized ranges;
- constraint `23P01` maps to HTTP 409;
- check/input errors map to HTTP 400.

Use a strict Zod schema:

```ts
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
const rangeSchema = z.object({
  weekday: z.number().int().min(1).max(7),
  startsAt: time,
  endsAt: time,
  note: z.string().trim().max(280).nullable().optional(),
}).strict()
const saveSchema = z.object({ ranges: z.array(rangeSchema).max(70) }).strict()
```

The 70-range cap is a defensive transport limit: ten ranges for each of seven days. It is not a product quota and can be revised with evidence.

- [x] **Step 3: Run route tests and confirm RED**

```bash
pnpm test -- src/app/api/tasks/availability/route.test.ts
```

Expected: FAIL because the route does not exist.

- [x] **Step 4: Implement GET and self-only PUT**

Implement `src/app/api/tasks/availability/route.ts` using:

```ts
const access = await requireModule('tasks')
if (!access.ok) return access.response
```

Resolve the application profile from `access.userId`:

```ts
const { data: viewer } = await db
  .from('usuarios')
  .select('id,rol,activo,equipo_id')
  .eq('auth_id', access.userId)
  .eq('activo', true)
  .maybeSingle()
```

GET must call `get_visible_weekly_availability()` once, group its flat rows by `user_id`, and serialize active jornada data plus ordered ranges. The SECURITY DEFINER read RPC is the dedicated narrow metadata boundary; do not broaden global `usuarios` RLS and do not issue per-card requests. Return:

```ts
return NextResponse.json(payload, {
  headers: { 'Cache-Control': 'no-store' },
})
```

PUT must:

1. parse `saveSchema`;
2. map DTOs to domain ranges and call `validateRanges`;
3. return 400 for structural errors;
4. invoke only:

```ts
await db.rpc('replace_own_weekly_availability', {
  p_ranges: ranges.map(item => ({
    weekday: item.weekday,
    starts_at: item.startsAt,
    ends_at: item.endsAt,
    note: item.note?.trim() || null,
  })),
})
```

5. return a refreshed `AvailabilityResponse` so the UI uses persisted canonical data.

Do not use `supabaseAdmin()` and do not accept `userId` in the PUT payload.

- [x] **Step 5: Write the browser adapter tests and implementation**

Test exact behavior:

```ts
await expect(fetchVisibleAvailability()).resolves.toEqual(response)
await expect(saveOwnAvailability(request.ranges)).resolves.toEqual(updatedResponse)
await expect(fetchVisibleAvailability()).rejects.toThrow('TASK_AVAILABILITY_LOAD_FAILED')
await expect(saveOwnAvailability(request.ranges)).rejects.toThrow('TASK_AVAILABILITY_SAVE_FAILED')
```

Implement `src/features/tasks/data/availability/index.ts`:

```ts
export async function fetchVisibleAvailability(): Promise<AvailabilityResponse> {
  const response = await fetch('/api/tasks/availability', { cache: 'no-store' })
  if (!response.ok) throw new Error('TASK_AVAILABILITY_LOAD_FAILED')
  return response.json()
}

export async function saveOwnAvailability(
  ranges: SaveOwnAvailabilityRequest['ranges'],
): Promise<AvailabilityResponse> {
  const response = await fetch('/api/tasks/availability', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ranges }),
  })
  if (!response.ok) throw new Error('TASK_AVAILABILITY_SAVE_FAILED')
  return response.json()
}
```

- [x] **Step 6: Run GREEN and typecheck the seam**

```bash
pnpm test -- \
  src/app/api/tasks/availability/route.test.ts \
  src/features/tasks/data/availability/index.test.ts
pnpm typecheck
```

Expected: PASS.

- [x] **Step 7: Commit the API work unit**

```bash
git add src/features/tasks/data/availability \
  src/app/api/tasks/availability
git commit -m "feat(tasks): expose weekly availability API"
```

---

### Task 4: Replace the Synthetic Cards with a Truthful Team Schedule

**Files:**
- Create: `src/features/tasks/components/solicitudes/MemberAvailabilityCard/index.test.tsx`
- Modify: `src/features/tasks/components/solicitudes/MemberAvailabilityCard/index.tsx`
- Modify: `src/features/tasks/components/solicitudes/MemberAvailabilityCard/index.module.css`
- Modify: `src/features/tasks/components/solicitudes/SolicitudesAvailabilityView/index.tsx`
- Modify: `src/features/tasks/components/solicitudes/SolicitudesAvailabilityView/index.module.css`
- Delete after import check: `src/features/tasks/components/solicitudes/HourSlot/`
- Delete after import check: `src/features/tasks/components/solicitudes/ActiveTaskLine/`

**Status (audited 2026-10-30):** Mostly done; one real gap. `MemberAvailabilityCard/index.tsx`
renders persisted ranges chronologically (`sortRanges`), the weekly declared total, the
empty-day/no-schedule distinction, and `HoursStatus` (symbol + text, never color alone) per day —
verified directly against `index.test.ts`'s five cases, all passing. `SolicitudesAvailabilityView`
fetches once via `fetchVisibleAvailability()` in a mount `useEffect` (`index.tsx:29-31`) and swaps
a card for `WeeklyAvailabilityEditor` only when `canEdit` — one aggregate request, not a
per-card waterfall, matching the plan and acceptance item 15. The real gap is Step 6: `rg -n
"HourSlot|ActiveTaskLine|slotOcupado|HORAS_SEMANALES|cargaDe" src` still returns matches, and
both are only their own definitions — `HourSlot/index.tsx` and `ActiveTaskLine/index.tsx` have
zero consumers anywhere in `src/`, confirmed by that exact grep. They were never deleted. This is
dead code, not a functional defect (nothing wires them into the new Availability screen), but it
is exactly the Step 6 instruction left undone.

- [x] **Step 1: State the interface intent before writing the component**

Record this intent in the task notes or component test description; do not introduce a separate design system:

```text
Human: a coordinator scanning whether teammates normally work at a given time,
and a contributor checking that their own schedule was saved correctly.
Goal: understand days, ranges, notes, and daily-hour differences without decoding a chart.
Feel: calm operational roster; dense enough to scan, never punitive.
Depth: existing project borders/surfaces only; no new shadow language.
Typography/spacing: reuse existing Tasks tokens and component rhythm.
Signature: each day is a compact schedule row whose ranges and daily comparison read together.
```

- [x] **Step 2: Write failing card tests**

Cover:

```tsx
render(<MemberAvailabilityCard member={member} onEdit={onEdit} />)
expect(screen.getByText('09:00–13:00')).toBeInTheDocument()
expect(screen.getByText('14:00–18:00')).toBeInTheDocument()
expect(screen.getByText('Not available for meetings')).toBeInTheDocument()
expect(screen.getByText(/8 of 8 hours/i)).toBeInTheDocument()
expect(screen.getByText(/12 hours declared/i)).toBeInTheDocument()
```

Also test:

- chronological order;
- empty day differs from “Availability not configured”;
- no schedule displays the explicit empty state;
- missing/inactive jornada displays the comparison-unavailable message;
- below/above/complete includes text and an icon/symbol, not color alone;
- `Edit my availability` appears only when `member.canEdit` is true;
- team name is visible when available;
- range note stays inside the same semantic list item as its time.

- [x] **Step 3: Run card tests and confirm RED**

```bash
pnpm test -- src/features/tasks/components/solicitudes/MemberAvailabilityCard/index.test.tsx
```

Expected: FAIL against the synthetic card.

- [x] **Step 4: Implement the persisted schedule card**

Change props to:

```ts
type Props = {
  member: AvailabilityMemberDto
  onEdit?: () => void
}
```

Render seven labeled days from a stable weekday constant. For each non-empty day:

- use `declaredHoursByDay`;
- call `compareDailyHours(dayHours, member.workday?.hoursPerDay ?? null)`;
- render ordered ranges and notes;
- render comparison text only for a non-empty day;
- render no warning for an empty day;
- render the weekly declared total without a weekly expected total.

Use semantic headings and lists. Keep color supplementary.

- [x] **Step 5: Make the view lazy and aggregate**

Update `SolicitudesAvailabilityView` to:

- fetch once with `fetchVisibleAvailability()` when the view mounts;
- show loading, error, empty-member, and loaded states;
- keep the returned `AvailabilityResponse` in local state;
- render one card per returned member;
- open editing only for the member whose `canEdit` is true;
- avoid adding availability to `AppContext`.

Do not issue one request per card.

- [ ] **Step 6: Remove synthetic imports and dead components** — NOT DONE. `HourSlot/` and
`ActiveTaskLine/` (both `.tsx` and `.module.css`) are still in the tree with zero consumers; see
Status above and the Remaining Work section.

Run:

```bash
rg -n "HourSlot|ActiveTaskLine|slotOcupado|HORAS_SEMANALES|cargaDe" src
```

Delete the synthetic-only components/styles and any now-unused exports. Preserve unrelated task workload helpers only if another consumer remains.

- [x] **Step 7: Run component, type, and CSS checks**

```bash
pnpm test -- src/features/tasks/components/solicitudes/MemberAvailabilityCard/index.test.tsx
pnpm typecheck
pnpm lint:css
```

Expected: PASS.

- [x] **Step 8: Commit the truthful read-view work unit**

```bash
git add src/features/tasks/components/solicitudes \
  src/features/tasks/utils/availability/index.ts
git commit -m "feat(tasks): show persisted team availability"
```

---

### Task 5: Add the Seven-Day Self-Service Editor

**Files:**
- Create: `src/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/index.tsx`
- Create: `src/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/index.module.css`
- Create: `src/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/index.test.tsx`
- Modify: `src/features/tasks/components/solicitudes/SolicitudesAvailabilityView/index.tsx`

**Status (audited 2026-10-30):** Done, with one dangling piece of visual polish. The editor is
far more decomposed than the plan sketched: `controller/`, `editor-state/`, `save-flow/`,
`DaySection/`, `AvailabilityRangeItem/` (with its own `view-model/`, `confirm-removal/`, and
`AvailabilityRangeItemFrame/`), each boxed with its own test, following this repo's
one-function-per-file convention. Confirmed directly: `EditableRange` keys off `clientId`
(`range-index`/`controller` tree), never an array index; removal runs through
`confirm-removal/index.ts` (`globalThis.confirm`) before calling `onRemove`; the remove button's
accessible label is built from `EDITOR_COPY.removeRange` with `{day, number}` vars — the "Remove
Monday range 2" shape the plan asks for; `RangeField/index.tsx` wires `aria-invalid` and
`aria-describedby` to a `role="alert"` message exactly as specified; `index.test.tsx:99` proves a
daily mismatch shows as text without disabling Save. `cf1d9ff3`/`0cc72ca8` (the Box→
`AvailabilityRangeItemFrame` refactor) is complete and wired, not left mid-refactor. The one real
gap, traced to the `fa18ebbd "wip(tasks): RangeField counter props (in progress)"` commit: the
note field's character counter (`noteCounterProps`, `AvailabilityRangeItem/view-model/fields/
note-counter/index.ts`) computes `counterNearLimit` and `Counter/index.tsx` renders it as
`data-near-limit="true/false"` on the `<p>` — but no CSS file anywhere in
`WeeklyAvailabilityEditor/` (`find ... -name "*.module.css"` → 4 files, grepped, zero hits for
`near-limit`) consumes that attribute. The near-limit state is wired in markup and tested at the
data-attribute level, but has no visual treatment — a real loose end from that WIP commit, not a
functional break (the always-visible counter text itself still works).

- [x] **Step 1: Write failing editor interaction tests**

Use stable test IDs or accessible names based on day and row identity. Cover:

1. add two Monday ranges;
2. remove only the selected range;
3. edit one range's note without changing another;
4. show inline invalid-time/end-before-start errors;
5. show overlap error;
6. allow touching ranges;
7. update daily and weekly declared totals;
8. show a non-blocking `6 of 8 hours` warning;
9. keep Save enabled for a daily mismatch;
10. disable or reject Save for structural errors;
11. call `saveOwnAvailability` only with ranges, never a user ID;
12. replace local state with the persisted response after save;
13. expose explicit labels for time fields;
14. expose `aria-invalid` and `aria-describedby` for invalid controls;
15. provide an accessible name such as `Remove Monday range 2`;
16. preserve keyboard navigation with native time/text inputs and buttons.

Representative test:

```tsx
await user.click(screen.getByRole('button', { name: /add monday range/i }))
await user.click(screen.getByRole('button', { name: /add monday range/i }))

const starts = screen.getAllByLabelText(/monday start time/i)
const ends = screen.getAllByLabelText(/monday end time/i)
await user.clear(starts[0])
await user.type(starts[0], '09:00')
await user.clear(ends[0])
await user.type(ends[0], '13:00')
await user.clear(starts[1])
await user.type(starts[1], '14:00')
await user.clear(ends[1])
await user.type(ends[1], '18:00')

expect(screen.getByText(/8 of 8 hours/i)).toBeInTheDocument()
```

- [x] **Step 2: Run editor tests and confirm RED**

```bash
pnpm test -- src/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/index.test.tsx
```

Expected: FAIL because the editor does not exist.

- [x] **Step 3: Implement stable editor state**

Use a local editor-only key:

```ts
type EditableRange = WeeklyAvailabilityRange & { clientId: string }
```

Initialize state directly from persisted ranges. Do not use array indexes as React keys. Add new rows with `crypto.randomUUID()` in the event handler.

Use native controls:

```tsx
<input type="time" step={300} />
<input type="text" maxLength={280} />
<button type="button">Remove</button>
```

For each error:

```tsx
<input
  aria-invalid={Boolean(error)}
  aria-describedby={error ? errorId : undefined}
/>
{error && <p id={errorId} role="alert">{message}</p>}
```

The weekly mismatch must never disable Save. Only structural validation or an active request disables it.

- [x] **Step 4: Wire explicit save and persisted refresh**

On Save:

1. validate local ranges;
2. call `saveOwnAvailability` with DTO fields only;
3. replace the parent `AvailabilityResponse` with the returned payload;
4. exit edit mode after success;
5. retain form values and show a textual error after failure.

The admin can open their own editor only. No prop or request path may target another user.

- [x] **Step 5: Run GREEN, accessibility checks, and narrow-layout assertions** (DOM-level accessibility assertions only; real narrow-viewport rendering is unverified — see Task 7 and Remaining Work)

```bash
pnpm test -- src/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/index.test.tsx
pnpm typecheck
pnpm lint:css
```

Expected: PASS.

Confirm manually in the component test DOM that:

- every time input has a visible label;
- every Remove button names its day/range;
- focus remains visible;
- controls remain at least 24×24 CSS pixels, preferably 44×44 on narrow screens;
- warning meaning is available as text.

- [x] **Step 6: Commit the editor work unit**

```bash
git add src/features/tasks/components/solicitudes/WeeklyAvailabilityEditor \
  src/features/tasks/components/solicitudes/SolicitudesAvailabilityView/index.tsx
git commit -m "feat(tasks): let users edit their weekly availability"
```

---

### Task 6: Open the Availability Tab and Replace Synthetic Copy

**Files:**
- Modify: `src/features/tasks/components/solicitudes/SolicitudesTab/index.tsx`
- Modify: `src/shared/i18n/locales/es.json`
- Modify: `src/shared/i18n/locales/en.json`
- Test: existing i18n tests under `src/shared/i18n/__tests__/`

**Status (audited 2026-10-30):** Mostly done; one real leftover of synthetic copy. The admin-only
gate is fully removed: `SolicitudesTab/index.tsx` builds `views[solTab]` unconditionally from
`SUB_TABS` for every Tasks user — there is no `esAdmin` filter anywhere in the file. Both locales
carry 40 `tasks.availability.*` keys, a superset of the plan's required list (e.g. `loadError` was
named `loadFailed`, plus extra keys for `saving`/`saved`/`removeConfirm`/`validationSummary` the
later editor work needed), and `dayBelow`/`dayComplete`/`dayAbove` carry the `{declared}`/
`{expected}`/`{difference}` placeholders Spanish and English both need. The leftover: the
Availability header still renders `stratix.avail.title`/`stratix.avail.sub` in
`SolicitudesAvailabilityView/index.tsx:55-56`, and `stratix.avail.sub` is still the OLD synthetic
copy from before this delivery — `"Lunes a viernes · 9:00 — 18:00 · hora de Guayaquil"` / `"Monday
to Friday · 9:00 AM — 6:00 PM · Guayaquil time"` (`es.json:947`, `en.json:947`). This directly
contradicts the spec's own principle ("remove the synthetic schedule instead of presenting it as
factual availability") — it is a real, user-visible trace of the fixed-hours assumption Delivery 1
exists to remove, not just unused dead code.

- [x] **Step 1: Add a failing tab-visibility assertion**

Extract only if needed for a clean unit test:

```ts
export const visibleSolicitudesTabs = () => SUB_TABS
```

Assert that Availability is present regardless of administrator status once the caller is already inside Tasks. Do not create new role-dependent visibility logic.

- [x] **Step 2: Run the focused test and confirm RED**

Run the new/updated tab test plus i18n contract tests:

```bash
pnpm test -- \
  src/features/tasks/components/solicitudes/SolicitudesTab/index.test.tsx \
  src/shared/i18n/__tests__/constants.test.ts \
  src/shared/i18n/__tests__/types.test.ts
```

Expected: tab assertion FAIL before removing the admin filter.

- [x] **Step 3: Remove the admin-only subtab gate**

Replace:

```ts
const visibleTabs = esAdmin ? SUB_TABS : SUB_TABS.filter(tab => tab.key === 'lista')
```

with:

```ts
const visibleTabs = SUB_TABS
```

Render `views[solTab]` for every Tasks user. Keep module authorization at the existing module boundary and at the new API/RLS boundaries.

- [ ] **Step 4: Replace old synthetic translations in both locales** — NOT fully done. `tasks.availability.*`
is comprehensive, but `stratix.avail.sub`'s fixed 9-to-18 copy was never replaced; see Status above
and Remaining Work.

Add matching keys for:

```text
tasks.availability.title
tasks.availability.loading
tasks.availability.loadError
tasks.availability.notConfigured
tasks.availability.noWorkday
tasks.availability.weekDeclared
tasks.availability.dayBelow
tasks.availability.dayComplete
tasks.availability.dayAbove
tasks.availability.editMine
tasks.availability.addRange
tasks.availability.removeRange
tasks.availability.startTime
tasks.availability.endTime
tasks.availability.note
tasks.availability.noteHint
tasks.availability.save
tasks.availability.cancel
tasks.availability.saveError
tasks.availability.invalidTime
tasks.availability.endNotAfterStart
tasks.availability.overlap
```

Spanish copy must communicate daily comparison, for example:

```text
{declared} de {expected} horas · faltan {difference} horas este día
```

English copy must carry identical placeholders and semantics. Remove keys that described synthetic occupied/free slots only after confirming no consumers remain.

- [x] **Step 5: Run GREEN and the complete locale checks**

```bash
pnpm test -- \
  src/features/tasks/components/solicitudes/SolicitudesTab/index.test.tsx \
  src/shared/i18n/__tests__/constants.test.ts \
  src/shared/i18n/__tests__/types.test.ts
pnpm typecheck
```

Expected: PASS.

- [x] **Step 6: Commit the access/copy work unit**

```bash
git add src/features/tasks/components/solicitudes/SolicitudesTab \
  src/shared/i18n/locales/es.json \
  src/shared/i18n/locales/en.json
git commit -m "feat(tasks): open availability to team members"
```

---

### Task 7: Prove the Complete User Journey and Run Final Gates

**Files:**
- Create: `e2e/task-availability.spec.ts`
- Modify if needed: `e2e/seed.ts`

**Status (audited 2026-10-30):** Partially done — this is where Delivery 1 is genuinely
incomplete. Confirmed by running the actual gates, not by reading code:

- `pnpm test` (full suite): **2315/2315 pass**, 585 files.
- `pnpm typecheck`: **clean**.
- `pnpm lint:css`: **clean**.
- `pnpm db:rls`: **passes** (pre-existing RLS debt warnings on unrelated tables only).
- `pnpm db:migraciones-fresca`: **fails**, but on a pre-existing, unrelated migration from `main`
  (`20261019120000_native_sales_membership_archive.sql` needs `storage.buckets`, which the
  disposable bare-Postgres image this check runs against never provisions) — confirmed via
  `git log main -- supabase/migrations/20261019120000_native_sales_membership_archive.sql`; it
  aborts before either availability migration runs, so this is not a Delivery 1 regression.
- `pnpm exec playwright test e2e/task-availability-rls`: **8/8 pass**, run live against the
  started local stack.
- `pnpm exec playwright test e2e/task-availability.spec.ts`: **the file does not exist.**
  `find e2e -iname "*task-availability*" ! -path "*rls*"` returns nothing; running Playwright
  against that exact path returns `Error: No tests found.` Step 1's complete browser journey —
  edit→save→reload-persists→teammate-read-only→admin-scope→narrow-viewport — was never written.
  This is the single largest remaining gap in Delivery 1.

- [ ] **Step 1: Write the failing browser journey** — NOT DONE. See Status above and Remaining Work.

Build one serialized Playwright flow:

1. authenticate as a regular active Tasks user with team and active jornada;
2. open `/tasks` and select Requests → Availability;
3. enter edit mode on the authenticated user's card;
4. add `09:00–13:00` and `14:00–17:00` on Monday;
5. add `Not available for meetings` to the second range;
6. verify `7 of 8 hours` and a non-blocking one-hour warning;
7. save successfully despite the warning;
8. reload and verify both ranges and note persist;
9. verify a teammate's card has no edit action;
10. authenticate as admin and verify all relevant cards are visible;
11. verify admin can edit only the admin's own card;
12. use a narrow viewport and verify no horizontal page overflow and all controls remain reachable.

Do not assert colors. Assert visible text, roles, labels, and authorization outcomes.

- [ ] **Step 2: Run the journey and confirm RED before final wiring** — blocked on Step 1.

```bash
pnpm exec playwright test e2e/task-availability.spec.ts
```

Expected: FAIL until all UI/API integration is complete.

- [ ] **Step 3: Make the smallest integration fixes** — nothing to fix found yet; depends on Step 1/2 actually running first.

Fix only failures required by the approved Delivery 1 spec. Do not add approvals, history, live state, task overlays, or balances.

- [x] **Step 4: Run focused unit and component tests** (ran as part of the full `pnpm test` pass — all green)

```bash
pnpm test -- \
  src/features/tasks/utils/availability/index.test.ts \
  src/features/tasks/data/availability/index.test.ts \
  src/app/api/tasks/availability/route.test.ts \
  src/features/tasks/components/solicitudes/MemberAvailabilityCard/index.test.tsx \
  src/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/index.test.tsx \
  src/features/tasks/components/solicitudes/SolicitudesTab/index.test.tsx
```

Expected: PASS.

- [x] **Step 5: Run static and database gates** (`typecheck`/`lint:css`/`db:rls` pass; `db:migraciones-fresca` blocked by an unrelated pre-existing migration — see Status above)

```bash
pnpm typecheck
pnpm lint:css
pnpm db:migraciones-fresca
pnpm db:rls
```

Expected: PASS.

- [ ] **Step 6: Run focused RLS and browser E2E** — RLS half passes 8/8 live; the browser-E2E half
cannot run because `e2e/task-availability.spec.ts` does not exist.

```bash
pnpm exec playwright test \
  e2e/task-availability-rls.spec.ts \
  e2e/task-availability.spec.ts
```

Expected: PASS.

- [x] **Step 7: Run the repository test suite** — `pnpm test`: 2315/2315 pass, no regressions observed.

```bash
pnpm test
```

Expected: PASS with no regression in Tasks or organizational catalogs.

- [ ] **Step 8: Inspect the review workload and commit the final journey** — blocked on Step 1.

```bash
git diff --stat HEAD~6..HEAD
git status --short
git add e2e/task-availability.spec.ts e2e/seed.ts
git commit -m "test(tasks): cover weekly availability journey"
```

The status must still show the user's pre-existing `.gitignore`/`.pi` changes untouched. If PR B exceeds the review budget materially, split styling polish from E2E fixture work only if each resulting commit remains independently reviewable.

---

## Remaining Work

Audited 2026-10-30 against the real code, not commit messages. Three concrete items remain
before Delivery 1 is actually complete. None requires new product scope — all three close gaps
inside the plan's own Tasks 4, 5, 6, and 7.

### Remaining 1: Write the complete browser journey (closes Task 7, Step 1)

**Files:**
- Create: `e2e/task-availability.spec.ts`
- Modify if needed: `e2e/availability-seed/` (reuse `assign-organization.ts`,
  `clear-weekly-availability.ts`, `first-departamento-id.ts` — do not duplicate their logic)

This is the one genuinely missing deliverable. `e2e/task-availability-rls/index.spec.ts` proves
authorization and constraints at the database boundary; nothing proves the UI journey a real user
takes.

1. Seed one team of two active `stratix360`-role users (owner + teammate) and one `admin` user,
   following the exact pattern `e2e/task-availability-rls/index.spec.ts:84-121` already
   established (`ensureUser`, `ensureTeam`, `assignOrganization`, cleanup in `afterAll`). Assign
   the owner an active jornada via `assignOrganization({ userId, equipoId, jornadaId })` — the RLS
   spec passes `jornadaId: null` throughout; this journey needs a real one so `8 of 8 hours` has
   something to compare against.
2. Authenticate as the owner (reuse this repo's existing Playwright login helper — check
   `e2e/roles/` or `e2e/lilly-access.spec.ts` for the current UI-login pattern rather than
   reinventing one), open `/tasks`, select Requests → Availability.
3. Enter edit mode on the owner's own card, add `09:00–13:00` and `14:00–17:00` on Monday, add the
   note `Not available for meetings` to the second range, assert `7 of 8 hours` renders as text
   (not color-only) with the one-hour-below symbol, then Save — assert Save is not disabled by
   the warning.
4. Reload the page and assert both ranges and the note persisted (proves the full round trip
   through `PUT`/`GET` and the `replace_own_weekly_availability` RPC, not just component state).
5. Assert the teammate's card renders with no edit affordance (`canEdit: false` end to end).
6. Authenticate as admin, assert the admin's card is visible among "all relevant" schedules, and
   that the admin can open only their own card's editor — not the owner's or teammate's.
7. Resize to a narrow viewport (the project's existing mobile breakpoint — check
   `e2e/constants.ts` or an existing responsive spec for the viewport size already used elsewhere
   rather than inventing a new one) and assert no horizontal page overflow and every control
   stays reachable. This is the only remaining unverified half of Final Acceptance Checklist item
   14 — accessibility *roles and labels* are already proven at the unit level
   (`WeeklyAvailabilityEditor/index.test.tsx`, `RangeField/index.test.tsx`); real rendered
   narrow-viewport behavior is not.
8. Run:

```bash
pnpm exec playwright test e2e/task-availability-rls e2e/task-availability.spec.ts
```

Expected: both pass. Then re-run the full Task 7 gate list (`pnpm test`, `pnpm typecheck`,
`pnpm lint:css`, `pnpm db:rls`) once more to confirm nothing regressed, and commit per Task 7
Step 8's original instructions.

### Remaining 2: Delete the dead synthetic components (closes Task 4, Step 6)

**Files:**
- Delete: `src/features/tasks/components/solicitudes/HourSlot/index.tsx`,
  `src/features/tasks/components/solicitudes/HourSlot/index.module.css`
- Delete: `src/features/tasks/components/solicitudes/ActiveTaskLine/index.tsx`,
  `src/features/tasks/components/solicitudes/ActiveTaskLine/index.module.css`

1. Re-run the plan's own check to confirm nothing has started importing them since this audit:

```bash
rg -n "HourSlot|ActiveTaskLine|slotOcupado|HORAS_SEMANALES|cargaDe" src
```

2. If the only matches are each component's own definition (as of this audit, they are), delete
   both folders.
3. Run `pnpm typecheck` and `pnpm test` to confirm nothing else referenced them.
4. Commit as its own reviewable unit — this is pure dead-code removal, unrelated to any other
   pending change.

### Remaining 3: Finish replacing synthetic copy, and wire the near-limit counter style (closes Task 6, Step 4 and the Task 5 RangeField-counter WIP thread)

**Files:**
- Modify: `src/features/tasks/components/solicitudes/SolicitudesAvailabilityView/index.tsx`
- Modify: `src/shared/i18n/locales/es.json`, `src/shared/i18n/locales/en.json`
- Modify: `src/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField/Counter/`
  (add `index.module.css`) or the existing
  `WeeklyAvailabilityEditor/AvailabilityRangeItem/index.module.css`

1. `SolicitudesAvailabilityView/index.tsx:55-56` still renders `stratix.avail.title`/
   `stratix.avail.sub`. `stratix.avail.sub`'s copy (`es.json:947`, `en.json:947`) is the old fixed
   9-to-18 schedule claim this delivery exists to remove. Replace both keys with
   `tasks.availability.*`-namespaced copy that describes the real screen (a recurring,
   self-declared weekly schedule — no fixed hours claim), or drop the subtitle entirely if the
   header reads fine without one. Either way, remove `stratix.avail.sub` from both locale files
   once nothing references it — confirm with
   `rg -n "stratix\.avail\." src`.
2. Add a CSS rule that actually uses the `data-near-limit` attribute
   `RangeField/Counter/index.tsx:4` already sets. `Counter` currently has no `index.module.css` of
   its own (verified: its folder holds only `index.tsx`, `index.test.tsx`, `types.ts`). Give it
   one with a `[data-near-limit='true']` rule (color from a `var(--c-...)` token, per this repo's
   CSS rules — no raw literals), import it in `Counter/index.tsx`, and apply the module class
   alongside the existing `data-near-limit` attribute so the near-limit state is visible, not just
   present in the DOM.
3. Run `pnpm lint:css` and the `Counter`/`RangeField` component tests; add a test asserting the
   near-limit class/attribute combination renders if one does not already cover the visual class.
4. Commit as its own reviewable unit.

## Final Acceptance Checklist

- [x] Multiple ranges can be saved on the same day. (`declaredHoursByDay` test, RLS e2e touching/overlap test)
- [x] Notes belong to one exact range and do not affect duration. (`durationHours` ignores `note`, per `index.test.ts`)
- [x] Touching ranges are valid; overlapping ranges are rejected in UI, API, and database. (verified at all three layers: `validateRanges`, `route.test.ts`, the `EXCLUDE USING gist` constraint)
- [x] Every non-empty day compares its sum with `jornada.horas_dia`. (`MemberAvailabilityCard` renders `compareDailyHours` per non-empty day only)
- [x] Empty days do not produce warnings. (`MemberAvailabilityCard/index.test.tsx`: "distinguishes an empty day...")
- [x] Weekly declared hours are informational only; no weekly target exists. (no weekly-expected function exists anywhere in `utils/availability/`)
- [x] A daily mismatch warns but does not block Save. (`WeeklyAvailabilityEditor/index.test.tsx:99`)
- [x] Missing/inactive jornada produces no fabricated target. (migration's `CASE WHEN workday.activo = true`; `compareDailyHours(_, null)` → `'unavailable'`)
- [x] Users edit only their own schedule. (RLS self-only policies + RPC, proven live by the e2e RLS spec)
- [x] Administrators read all relevant schedules but cannot edit another user's schedule. (RLS e2e: admin's own PATCH on another's row succeeds as a request but touches nothing)
- [x] Regular users read same-team schedules; teamless users receive no broad access. (RLS e2e: teamless user's cross-user read returns `[]`)
- [ ] The UI no longer presents task estimates as occupied schedule slots. **Partially true**: `HourSlot`/`ActiveTaskLine` are unwired dead code (not rendered by the new screen), but `SolicitudesAvailabilityView`'s header subtitle still states the old fixed `9:00–18:00` schedule as fact — see Remaining Work items 2 and 3.
- [x] Loading, error, empty, invalid, and save-failure states are explicit. (`AVAILABILITY_VIEW_STATUS`, `editor-state/transitions`, both tested)
- [ ] The experience is keyboard-accessible and usable on narrow screens. **Partially verified**: labels, `aria-invalid`/`aria-describedby`, and native controls are proven at the unit/DOM level; no real browser check of narrow-viewport rendering exists yet — see Remaining Work item 1, step 7.
- [x] Availability loads lazily in one aggregate request, not in global startup context or per-card waterfalls. (`SolicitudesAvailabilityView` fetches once in a mount `useEffect`; never added to `AppContext`)
- [x] Delivery 2/3 behavior has not leaked into Delivery 1. (the Delivery 2 planned-schedules exploration was kept out of the repo entirely — commit `bd1fc99e` moved it to `.todo`; nothing in the Task 1-7 code implements exceptions, history, approvals, or balances)

## Plan Self-Review

- **Spec coverage:** All Delivery 1 acceptance areas map to Tasks 1–7.
- **Authorization:** Self-write, same-team read, admin read-all/no foreign write, module gate, and teamless behavior are tested at the database and application boundaries.
- **Truthfulness:** The plan deletes synthetic slots and explicitly forbids weekly expected-hours derivation.
- **Extensibility:** Recurring ranges remain separate from future dated overrides and actual-time ledgers.
- **Atomicity:** Full-schedule replacement occurs in one PostgreSQL RPC transaction.
- **Accessibility:** Labels, error associations, non-color status, focus, keyboard controls, and narrow screens are included.
- **Reviewability:** Work starts with one bounded reference-research commit, then seven behavior commits across two recommended chained PRs.
