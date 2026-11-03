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
- org-wide read access for any active user with Tasks access, regardless of team or role;
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
migration, so it is not evidence against this task. A third migration,
`supabase/migrations/20261102164954_widen_weekly_availability_org_wide.sql`, replaces
`can_read_weekly_availability()` again: it drops the `caller.equipo_id = owner.equipo_id`
team-matching branch entirely, leaving "owner has `tasks` module access" (via `role_modules` or
the admin short-circuit) as the only read gate — self-read keeps working because it is no longer
identity-based, it just falls out of the owner also having `tasks` access. Write stays
self-only, untouched.

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

- [x] **Step 6: Remove synthetic imports and dead components** — **Done** (`31b20ece`,
re-verified 2026-11-02). `HourSlot/` and `ActiveTaskLine/` no longer exist anywhere in the tree;
`rg -n "HourSlot|ActiveTaskLine|slotOcupado|HORAS_SEMANALES|cargaDe" src` now returns zero
matches.

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

- [x] **Step 4: Replace old synthetic translations in both locales** — **Done** (`cf688651`,
re-verified 2026-11-02). `SolicitudesAvailabilityView` now renders `tasks.availability.title`/
`tasks.availability.sub` instead of `stratix.avail.*`; `rg -n "stratix\.avail\." src` returns zero
matches in both locale files and the component.

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
- `pnpm exec playwright test e2e/task-availability.spec.ts`: **stale as of 2026-11-02** — the
  file now exists at `e2e/task-availability-journey/index.spec.ts` (`be672aec`, updated by
  `0ce645fd`) and covers exactly the edit→save→reload-persists→teammate-read-only→admin-scope→
  narrow-viewport journey this step asked for; both commits report it green. What remains open
  is independent re-verification of the *current* file content after `0ce645fd`'s modal rewrite
  — that commit's own message says it was not independently re-run that session and asks for a
  live re-check; see Step 6 below, left unchecked for that reason.

- [x] **Step 1: Write the failing browser journey** — **Done** (`be672aec`, updated by
`0ce645fd`; re-verified 2026-11-02). The journey lives at
`e2e/task-availability-journey/index.spec.ts`, not the plan's literal `e2e/task-availability.spec.ts`
— this repo's `e2e/` already boxes every suite into its own folder, so `be672aec`'s own commit
message documents that deviation. It covers exactly the edit→save→reload-persists→
teammate-read-only→admin-scope→narrow-viewport flow this step asked for.

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

- [x] **Step 2: Run the journey and confirm RED before final wiring** — **Done historically**:
`be672aec`'s commit message documents real-browser findings a unit-test mock could never have
surfaced (cookie-clearing on a second login, the live "N of M hours" text not proving
persistence, org-wide card-name collisions, unescaped emoji breaking exact-name matching) — each
one is evidence the spec was actually run against the real app and fixed, not merely written.
Re-verified 2026-11-02: see Step 6 below for whether the *current* committed state (after the
later `0ce645fd` modal-unification rewrite) has been independently re-run — that part is still
open.

```bash
pnpm exec playwright test e2e/task-availability.spec.ts
```

Expected: FAIL until all UI/API integration is complete.

- [x] **Step 3: Make the smallest integration fixes** — **Done**: per `be672aec`'s commit
message, every fix the real browser forced was test-side (selectors/cookies/accessible-name
matching), not production code — Tasks 4–6 had already implemented and unit-tested the real
UI/API, so no additional integration fix to `src/` was needed. Re-verified 2026-11-02.

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

- [ ] **Step 6: Run focused RLS and browser E2E** — Still genuinely open as of 2026-11-02, not
just a stale checkbox. The RLS half passes 8/8 live (re-confirmed via `pnpm db:rls`, clean). The
browser-E2E half (`e2e/task-availability-journey/index.spec.ts`, the plan's intended
`e2e/task-availability.spec.ts`) was last reported green by `be672aec` and then rewritten by
`0ce645fd` for the modal-unification change — and `0ce645fd`'s own commit message explicitly
says that rerun was **not independently re-run by the controller** that session (port conflict +
a degraded-session signal) and asks for re-verification "in the next session." Starting a second
`pnpm dev`/Playwright run here was not attempted: this is a shared worktree with another agent's
concurrent work in progress, and this repo's own incident history (two `next dev` processes
corrupting `.next/`) makes that unsafe to try blind. Leaving unchecked — the next session needs
to actually run `pnpm exec playwright test e2e/task-availability-rls e2e/task-availability-journey`
live before treating the current spec content as proven green.

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

- [x] **Step 8: Inspect the review workload and commit the final journey** — **Done**: the
journey was committed as its own reviewable unit twice — `be672aec` (initial journey) and
`0ce645fd` (updated to drive the unified modal) — each a separate, independently reviewable
commit rather than one oversized change. Re-verified 2026-11-02.

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
inside the plan's own Tasks 4, 5, 6, and 7. Every file path, signature, and i18n key below was
re-read directly from the current tree while writing this section (not carried over from the
audit's line numbers unchecked).

### Remaining 1: Write the complete browser journey (closes Task 7, Step 1)

**Files:**
- Create: `e2e/availability-seed/first-active-jornada.ts` — fixture helper; the two existing RLS
  fixtures (`assign-organization.ts`, `clear-weekly-availability.ts`) stay untouched, and
  `first-departamento-id.ts` is reused verbatim, not duplicated.
- Create: `e2e/task-availability.spec.ts`

**Context confirmed before writing this task:**
- `e2e/task-availability-rls/index.spec.ts` authenticates through raw PostgREST (`rest.token`),
  never the browser — it proves RLS, not the UI. `e2e/lilly-access.spec.ts:158-162` and
  `e2e/native-sales.spec.ts:45-49` are this repo's real UI-login pattern (plain `page.goto`,
  no shared helper): `page.goto('/login')` →
  `page.getByPlaceholder('tu@eminat.net').fill(email)` →
  `page.locator('input[type="password"]').fill(PASSWORD)` → `.press('Enter')` →
  `page.waitForURL('http://localhost:3000/', { timeout: 40000 })`. (`e2e/roles/login-as/index.ts`
  is a different, more elaborate helper scoped to the `roles`/`billing-v2` suites — it clears
  cookies/CDP storage and imports `@e2e/billing-v2/constants`; reusing it here would pull in that
  coupling for no benefit, so this task uses the plain pattern instead.)
- The sidebar label for the Tasks "Requests" section is literally `'Requests'`
  (`src/shared/components/shell/appShellConfig/subvistas.ts:18`, rendered as a native `<button>`
  by `PanelItem`); the sub-tab is literally `'Availability'`
  (`stratix.sol.tabAvailability` in both locales, rendered as a native `<button>` by `TabButton`
  — `src/features/tasks/components/solicitudes/SolicitudesTab/index.tsx:11`).
- Each card's edit affordance is `<Button kind="edit" iconOnly>`
  (`MemberAvailabilityCard/index.tsx:37`), whose accessible name is the generic `common.edit` →
  `"Edit"` (`Button/meta.ts:11`, `en.json` `"common.edit": "Edit"`) — not the unwired
  `tasks.availability.editMine` key. It renders only when `member.canEdit` is true, so at most one
  "Edit" button exists on screen at a time for any viewer.
- Range row labels are built as `"{Day} {field}"` with a single-space separator
  (`AvailabilityRangeItem/view-model/fields/index.ts:26-28`,
  `AvailabilityRangeItem/constants.ts:6`): `"Monday start time"`, `"Monday end time"`,
  `"Monday note"`. The add-range button's accessible name is the full i18n string
  `"Add a {day} range"` → `"Add a Monday range"` (`tasks.availability.addRange`), not the
  shorthand `/add monday range/i` Task 5's illustrative test used. The Save button's name is
  `"Save availability"` (`tasks.availability.save`).
- `MemberAvailabilityCard` is an `<article>` whose first line of text is the member's name
  (`index.tsx:28-33`), so a card can be scoped with
  `page.locator('article').filter({ hasText: <name> })`.
- No fixture anywhere assigns a real `jornada_id`; `assignOrganization`
  (`e2e/availability-seed/assign-organization.ts`) already accepts `{ userId, equipoId,
  jornadaId }` and the RLS spec always passes `jornadaId: null`. The seeded catalog always has a
  full-time jornada (`supabase/migrations/20260808190614_jornadas_catalogo.sql:42-44`:
  `('COMPLETA', 'Jornada completa', 8)`, idempotent via `ON CONFLICT (codigo) DO NOTHING`), so a
  new fixture can fetch it deterministically instead of guessing an id.
- The repo has no single exported narrow-viewport constant. The value `{ width: 390, height: 844
  }` is what's actually reused across the suite today — `e2e/billing-v2/phone.spec.ts:12`'s local
  `const PHONE` and `e2e/meetings-synthetic.spec.ts:102`'s inline literal both use it — so this
  task reuses that exact value as its own local constant rather than inventing a new one.
  `e2e/native-sales.spec.ts:61,79-81` is the existing no-overflow assertion pattern:
  `document.documentElement.scrollWidth > window.innerWidth + 1`.

- [x] **Step 1: Add the jornada fixture helper** — **Done** (`e2e/availability-seed/first-active-jornada.ts`
exists, verified 2026-11-02; mirrors `first-departamento-id.ts`'s shape as planned).

Create `e2e/availability-seed/first-active-jornada.ts`, mirroring
`e2e/availability-seed/first-departamento-id.ts`'s shape exactly:

```ts
import { URL } from '../constants'
import { H } from '../seed'

export type ActiveJornada = { id: string; horasDia: number }

/** Reads the seeded full-time jornada (`codigo = 'COMPLETA'`, 8 hours/day) with service_role,
 *  so the availability journey spec has a deterministic non-null workday to compare against. */
export default async function firstActiveJornada(): Promise<ActiveJornada> {
  const selectUrl = `${URL}/rest/v1/jornadas?codigo=eq.COMPLETA&select=id,horas_dia&limit=1`
  const selectInit = { headers: H }
  const response = await fetch(selectUrl, selectInit)
  const rows = await response.json()
  return { id: rows[0].id, horasDia: rows[0].horas_dia }
}
```

This has no RED/GREEN cycle of its own — it is a data fixture with no branching behavior, the
same treatment this plan's own Task 2 Step 1 gave `assignOrganization`/`clearWeeklyAvailability`.

- [x] **Step 2: Write the failing complete browser journey** — **Done**, at
`e2e/task-availability-journey/index.spec.ts` instead of the literal filename below (this repo's
`e2e/` boxes every suite into its own folder); verified 2026-11-02 the real file covers the same
flow this illustrative sample does, with findings from the real browser folded in (see `be672aec`).

Illustrative sample from the original plan (superseded by the real file above):

```ts
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { ADMIN_ROLE } from '@/shared/auth/permissions'
import { PASSWORD, ensureUser, getUsuario, deleteUser, H } from '../seed'
import { URL } from '../constants'
import assignOrganization from '../availability-seed/assign-organization'
import clearWeeklyAvailability from '../availability-seed/clear-weekly-availability'
import firstDepartamentoId from '../availability-seed/first-departamento-id'
import firstActiveJornada from '../availability-seed/first-active-jornada'

const TASKS_ROLE = 'stratix360'
const SURNAME = 'AvailJourneye2e'
const OWNER_EMAIL = 'owner.availability.journey.e2e@eminat.net'
const TEAMMATE_EMAIL = 'teammate.availability.journey.e2e@eminat.net'
const ADMIN_EMAIL = 'admin.availability.journey.e2e@eminat.net'
const TEAM_CODE = 'E2E_AVAIL_JOURNEY_TEAM'
const HOME_URL = 'http://localhost:3000/'
const LOGIN_WAIT = { timeout: 40000 }
// Reused verbatim from e2e/billing-v2/phone.spec.ts's PHONE / e2e/meetings-synthetic.spec.ts;
// this repo has no single exported narrow-viewport constant to import instead.
const NARROW_VIEWPORT = { width: 390, height: 844 }

async function ensureTeam(codigo: string, nombre: string, departamentoId: string): Promise<string> {
  const insertUrl = `${URL}/rest/v1/equipos?on_conflict=codigo`
  const teamBody = { codigo, nombre, departamento_id: departamentoId }
  const response = await fetch(insertUrl, {
    method: 'POST',
    headers: { ...H, Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(teamBody),
  })
  if (!response.ok) throw new Error(`ensureTeam ${codigo}: ${response.status} ${await response.text()}`)
  const rows = await response.json()
  return rows[0].id
}

async function deleteTeam(codigo: string): Promise<void> {
  await fetch(`${URL}/rest/v1/equipos?codigo=eq.${codigo}`, { method: 'DELETE', headers: H })
}

async function login(page: Page, email: string): Promise<void> {
  await page.goto('/login')
  await page.getByPlaceholder('tu@eminat.net').fill(email)
  const password = page.locator('input[type="password"]')
  await password.fill(PASSWORD)
  await password.press('Enter')
  await page.waitForURL(HOME_URL, LOGIN_WAIT)
}

async function openAvailability(page: Page): Promise<void> {
  await page.goto('/tasks')
  await page.getByRole('button', { name: 'Requests', exact: true }).click()
  await page.getByRole('button', { name: 'Availability', exact: true }).click()
}

const cardFor = (page: Page, name: string) => page.locator('article').filter({ hasText: name })

let ownerId: string
let teammateId: string
let adminId: string

test.beforeAll(async () => {
  const departamentoId = await firstDepartamentoId()
  const teamId = await ensureTeam(TEAM_CODE, 'E2E Availability Journey Team', departamentoId)
  const jornada = await firstActiveJornada()

  await ensureUser(OWNER_EMAIL, TASKS_ROLE, 'Owner', SURNAME)
  await ensureUser(TEAMMATE_EMAIL, TASKS_ROLE, 'Teammate', SURNAME)
  await ensureUser(ADMIN_EMAIL, ADMIN_ROLE, 'Admin', SURNAME)

  ownerId = (await getUsuario(OWNER_EMAIL)).id
  teammateId = (await getUsuario(TEAMMATE_EMAIL)).id
  adminId = (await getUsuario(ADMIN_EMAIL)).id

  await assignOrganization({ userId: ownerId, equipoId: teamId, jornadaId: jornada.id })
  await assignOrganization({ userId: teammateId, equipoId: teamId, jornadaId: jornada.id })
})

test.afterAll(async () => {
  await clearWeeklyAvailability([ownerId, teammateId, adminId])
  await deleteUser(OWNER_EMAIL)
  await deleteUser(TEAMMATE_EMAIL)
  await deleteUser(ADMIN_EMAIL)
  await deleteTeam(TEAM_CODE)
})

test('owner edits and saves Monday availability, it persists, a teammate stays read-only, ' +
  'an admin can edit only their own card, and the layout holds at a narrow viewport', async ({ page }) => {
  await login(page, OWNER_EMAIL)
  await openAvailability(page)

  await cardFor(page, 'Owner').getByRole('button', { name: 'Edit', exact: true }).click()
  const addMondayRange = page.getByRole('button', { name: 'Add a Monday range' })
  await addMondayRange.click()
  await addMondayRange.click()

  const starts = page.getByLabel('Monday start time')
  const ends = page.getByLabel('Monday end time')
  await starts.nth(0).fill('09:00')
  await ends.nth(0).fill('13:00')
  await starts.nth(1).fill('14:00')
  await ends.nth(1).fill('17:00')
  await page.getByLabel('Monday note').nth(1).fill('Not available for meetings')

  await expect(page.getByText(/7 of 8 hours/i)).toBeVisible()
  const saveButton = page.getByRole('button', { name: 'Save availability' })
  await expect(saveButton).toBeEnabled()
  await saveButton.click()
  await expect(page.getByText(/7 of 8 hours/i)).toBeVisible()

  await page.reload()
  await openAvailability(page)
  await expect(page.getByText('09:00–13:00')).toBeVisible()
  await expect(page.getByText('14:00–17:00')).toBeVisible()
  await expect(page.getByText('Not available for meetings')).toBeVisible()
  await expect(cardFor(page, 'Teammate').getByRole('button', { name: 'Edit' })).toHaveCount(0)

  await login(page, ADMIN_EMAIL)
  await openAvailability(page)
  await expect(cardFor(page, 'Owner')).toBeVisible()
  await expect(cardFor(page, 'Teammate')).toBeVisible()
  await expect(cardFor(page, 'Admin')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(1)
  await expect(cardFor(page, 'Owner').getByRole('button', { name: 'Edit' })).toHaveCount(0)
  await expect(cardFor(page, 'Teammate').getByRole('button', { name: 'Edit' })).toHaveCount(0)
  await expect(cardFor(page, 'Admin').getByRole('button', { name: 'Edit' })).toHaveCount(1)

  await page.setViewportSize(NARROW_VIEWPORT)
  await openAvailability(page)
  const overflows = await page.evaluate(() =>
    document.documentElement.scrollWidth > window.innerWidth + 1)
  expect(overflows, 'availability screen overflows the narrow viewport').toBe(false)
})
```

- [x] **Step 3: Run the journey and confirm RED** — **Done historically**: see Task 7 Step 2
above — `be672aec`'s commit message lists concrete real-browser findings (cookie-clearing,
accessible-name matching, etc.) that only surface from an actual failing run against the live
app, not from reading the code. Re-verified 2026-11-02.

```bash
pnpm exec playwright test e2e/task-availability.spec.ts
```

Expected: FAIL — the file does not exist yet before Step 1/2 land, and `find e2e -iname
"*task-availability*" ! -path "*rls*"` currently returns nothing.

- [x] **Step 4: Make the smallest integration fixes, if any** — **Done**: none were needed in
`src/` — per `be672aec`, every fix the real browser forced was test-side. Re-verified 2026-11-02.

The UI and API this spec drives were already implemented and unit-tested by Tasks 4–6; this step
exists only in case the real browser surfaces something the unit tests' mocks hid (for example a
selector text mismatch). Fix only what the approved Delivery 1 spec requires — no approvals,
history, live state, task overlays, or balances.

- [ ] **Step 5: Run GREEN** — Still genuinely open as of 2026-11-02. `be672aec`/`0ce645fd`'s
commit messages both report the journey + RLS specs green, but `0ce645fd`'s own message states
that run was not independently re-verified by a controller that session and asks for a live
re-check next session. Not attempted here: this worktree has another agent's concurrent work in
progress, and this repo's own incident history (two `next dev` processes corrupting `.next/`)
makes starting a second dev server unsafe without first confirming port 3000 is free and nothing
else is mid-edit. Same open item as Task 7 Step 6 above.

```bash
pnpm exec playwright test e2e/task-availability-rls e2e/task-availability.spec.ts
```

Expected: both pass.

- [ ] **Step 6: Re-run the full Task 7 gate list** — Partially re-verified 2026-11-02, partially
blocked by unrelated concurrent work, not by anything in this plan's scope: `pnpm lint:css` and
`pnpm db:rls` both pass clean (re-run directly). `pnpm test`/`pnpm typecheck` currently fail, but
only on files under `src/features/tasks/components/solicitudes/AvailabilityWeekGrid/` — the
separate, not-yet-landed drag-grid work another agent is actively building in this same
worktree (per `docs/superpowers/specs/2026-11-02-task-availability-unified-drag-grid-design.md`),
not a regression in anything this plan touches. Every file this plan's Remaining items actually
touch (`Counter/index.test.tsx`, the i18n contract tests) passes in isolation when run alone.
Leaving unchecked because the literal "all PASS" bar isn't met right now, even though the cause
is out of scope.

```bash
pnpm test
pnpm typecheck
pnpm lint:css
pnpm db:rls
```

Expected: all PASS, confirming nothing regressed. (`pnpm db:migraciones-fresca` is expected to
keep failing on the unrelated pre-existing `20261019120000_native_sales_membership_archive.sql`
migration documented in Task 7's Status — not a signal to re-check here.)

- [x] **Step 7: Commit the journey work unit** — **Done**: `be672aec`/`0ce645fd` committed it,
at `e2e/task-availability-journey/index.spec.ts` and `e2e/availability-seed/first-active-jornada.ts`
instead of the literal paths below. Re-verified 2026-11-02.

```bash
git add e2e/task-availability.spec.ts e2e/availability-seed/first-active-jornada.ts
git commit -m "test(tasks): cover weekly availability journey"
```

### Remaining 2: Delete the dead synthetic components (closes Task 4, Step 6)

**Files:**
- Delete: `src/features/tasks/components/solicitudes/HourSlot/index.tsx`,
  `src/features/tasks/components/solicitudes/HourSlot/index.module.css`
- Delete: `src/features/tasks/components/solicitudes/ActiveTaskLine/index.tsx`,
  `src/features/tasks/components/solicitudes/ActiveTaskLine/index.module.css`

No RED/GREEN cycle applies — this is pure deletion, the same treatment this plan's own Task 4
Step 6 already gives it.

1. Re-run the plan's own check to confirm nothing has started importing them since the audit.
   Re-verified while writing this section (2026-10-30): still true — the only two matches are
   each component's own definition line.

```bash
rg -n "HourSlot|ActiveTaskLine|slotOcupado|HORAS_SEMANALES|cargaDe" src
```

2. If the only matches are each component's own definition, delete both folders.
3. Run `pnpm typecheck` and `pnpm test` to confirm nothing else referenced them.
4. Commit as its own reviewable unit — unrelated to any other pending change.

```bash
git add src/features/tasks/components/solicitudes/HourSlot \
  src/features/tasks/components/solicitudes/ActiveTaskLine
git commit -m "chore(tasks): remove the dead synthetic availability components"
```

### Remaining 3: Finish replacing synthetic copy, and wire the near-limit counter style (closes Task 6, Step 4 and the Task 5 RangeField-counter WIP thread)

**Files:**
- Create: `src/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField/Counter/index.module.css`
- Modify: `src/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField/Counter/index.tsx`
- Modify: `src/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField/Counter/index.test.tsx`
- Modify: `src/features/tasks/components/solicitudes/SolicitudesAvailabilityView/index.tsx`
- Modify: `src/shared/i18n/locales/es.json`, `src/shared/i18n/locales/en.json`

**Re-verified while writing this section (2026-10-30), both still accurate:**
- `SolicitudesAvailabilityView/index.tsx:55-56` still renders `{t('stratix.avail.title')}` /
  `{t('stratix.avail.sub')}`. `stratix.avail.sub` is still the old fixed-hours claim
  (`es.json:947`: `"Lunes a viernes · 9:00 — 18:00 · hora de Guayaquil"`; `en.json:947`:
  `"Monday to Friday · 9:00 AM — 6:00 PM · Guayaquil time"`). A truthful, unwired replacement
  title key already exists and only needs to be consumed:
  `"tasks.availability.title"` = `"Disponibilidad semanal"` / `"Weekly availability"`
  (`es.json:966`, `en.json:966`) — `rg -n "tasks\.availability\.title" src` shows zero consumers
  today.
- `Counter/index.tsx` sets `data-near-limit={nearLimit}` on the `<p>` but imports no CSS module;
  its folder holds only `index.tsx`, `index.test.tsx`, `types.ts` — confirmed again by listing it.
  `Counter/index.test.tsx` currently asserts only the raw `data-near-limit="true"` attribute
  (`it('flags the near-limit state as a data attribute', ...)`), never a visual class — the RED
  test below is new, not a duplicate.
- This codebase's CSS Modules resolve to their literal, unhashed local names under Vitest/SSR —
  confirmed directly against `src/shared/components/views/CalendarView/DayNumber/index.tsx`
  (`className={today ? \`${s.number} ${s.today}\` : s.number}`) and its test
  (`expect(draw(open).className).toBe('entry')`-style assertions in the sibling `DayEntry` test).
  So `s.counter` renders as the literal string `"counter"` in a test, not a content hash.
- `src/app/globals.css` defines `--c-warn-solid: #B45309` (an amber warning token, distinct from
  `--c-danger-solid`, which this repo's "Red means destruction" rule reserves for destructive
  actions) — the correct token for an approaching-but-not-yet-exceeded character limit.

- [x] **Step 1: Write the failing near-limit style test** — **Done**: verified 2026-11-02 that
`Counter/index.test.tsx` contains exactly this test, unchanged from the plan's own text.

Add to `Counter/index.test.tsx`:

```tsx
it('carries the counter class that the near-limit CSS rule styles', () => {
  const html = renderToStaticMarkup(<Counter id="note-counter" text="close" nearLimit />)

  expect(html).toContain('class="counter"')
  expect(html).toContain('data-near-limit="true"')
})
```

- [x] **Step 2: Run the test and confirm RED** — **Done historically**: `cf688651`'s commit
message documents a real discovery mid-cycle (the plan's own assumption that CSS Modules resolve
unhashed under Vitest was verified false, forcing the `vi.mock` approach actually in the test
file today) — the kind of finding that only comes from running the test and hitting a real
failure, not from reading the plan. Re-verified 2026-11-02 the test passes GREEN today
(`npx vitest run` on this file: 3/3 pass).

```bash
pnpm test -- src/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField/Counter/index.test.tsx
```

Expected: FAIL — `Counter` renders no `class` attribute at all yet.

- [x] **Step 3: Apply the module class and the near-limit CSS rule** — **Done**: verified
2026-11-02 that `Counter/index.module.css` and `Counter/index.tsx` match this exactly.

Create `Counter/index.module.css`:

```css
.counter[data-near-limit='true'] {
  color: var(--c-warn-solid);
}
```

Update `Counter/index.tsx` to import it and apply the class unconditionally — the attribute
selector above is what makes the color conditional, not a second toggled class:

```tsx
import type { CounterProps } from './types'
import s from './index.module.css'

export default function Counter({ id, text, nearLimit }: CounterProps) {
  return <p id={id} data-near-limit={nearLimit} className={s.counter}>{text}</p>
}
```

- [x] **Step 4: Replace the synthetic header copy** — **Done**: verified 2026-11-02 that
`SolicitudesAvailabilityView/index.tsx` renders `tasks.availability.title`/`tasks.availability.sub`,
both locale files carry the truthful key, and `rg -n "stratix\.avail\." src` returns zero matches.

In `SolicitudesAvailabilityView/index.tsx:55-56`, replace:

```tsx
<div className={s.title}>{t('stratix.avail.title')}</div>
<div className={s.sub}>{t('stratix.avail.sub')}</div>
```

with:

```tsx
<div className={s.title}>{t('tasks.availability.title')}</div>
<div className={s.sub}>{t('tasks.availability.sub')}</div>
```

Add `tasks.availability.sub` next to the existing `tasks.availability.title` key (`es.json:966`,
`en.json:966`) in both locale files, describing the real screen with no fixed-hours claim:

```text
es: "tasks.availability.sub": "Disponibilidad semanal declarada por cada persona."
en: "tasks.availability.sub": "Weekly availability as declared by each person."
```

Remove the now-unused `stratix.avail.title` and `stratix.avail.sub` keys from both locale files.
Confirm with:

```bash
rg -n "stratix\.avail\." src
```

Expected: no matches.

- [x] **Step 5: Run GREEN and the locale/CSS gates** — **Re-verified 2026-11-02**: the Counter
test (3/3), both i18n contract tests (5/5), and `pnpm lint:css` all pass clean when run directly.
`pnpm typecheck` currently fails, but only on files under the separate, concurrently-in-progress
`AvailabilityWeekGrid/` drag-grid work (another agent's WIP in this same worktree) — nothing this
step touches.

```bash
pnpm test -- \
  src/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField/Counter/index.test.tsx \
  src/shared/i18n/__tests__/constants.test.ts \
  src/shared/i18n/__tests__/types.test.ts
pnpm lint:css
pnpm typecheck
```

Expected: all PASS.

- [x] **Step 6: Commit the copy/style work unit** — **Done**: this is `cf688651`. Re-verified
2026-11-02.

```bash
git add src/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/RangeField/Counter \
  src/features/tasks/components/solicitudes/SolicitudesAvailabilityView/index.tsx \
  src/shared/i18n/locales/es.json \
  src/shared/i18n/locales/en.json
git commit -m "fix(tasks): remove the fixed-hours copy and style the near-limit counter"
```

### What follows: Delivery 2

Once the three items above close Delivery 1, the next phase — planned, date-bound schedules and
reusable templates — already has a finalized design. By explicit product-owner decision that
design is kept out of this repository's git history as draft/unapproved scope: the design doc
(with its own §7 Reuse analysis and §8 Delivery mapping) and its two prototype HTML files live at
`~/.local/share/todo/eminat-app/attachments/2026-10-30-delivery-2-planned-schedules/`
(`design-doc.md`; `weekly-availability-grid-prototype.html` is the canonical prototype,
`my-availability-plans-prototype.html` is an earlier, now-superseded exploration).

That design doc's own §7 Reuse analysis already identifies the single biggest piece of net-new
work a future Delivery 2 plan will have to tackle first: **no reusable grid/canvas component
exists anywhere in this codebase.** Both existing calendar-shaped components
(`CalendarTab`, `CalendarView`) are date-cell month/week calendars with no hour axis and no
drag support. A day-columns × hour-rows grid with click/drag-to-create, drag-to-resize, and a
confirm popover has no precedent in `src/` and will need to be built from scratch.

That design doc's own §4.5/§15 reconciliation note flagged one item as already signed off and
in need of being pulled out of Delivery 2 and reconciled back into this (Delivery 1) plan: the
reversal of same-team/admin-read-all into org-wide read access for every user with Tasks access.
That reconciliation happened directly in this session —
`supabase/migrations/20261102164954_widen_weekly_availability_org_wide.sql` (see Task 2's
Status note and the Final Acceptance Checklist above) implements it in Delivery 1 itself, not as
Delivery 2 scope. Whoever next reconciles the design doc against this plan should treat that
read-visibility reversal as closed here, not as something still owed by Delivery 2.

Delivery 2 is **not approved scope** — except for one piece the product owner explicitly pulled
forward on 2026-11-02: the grid/canvas interaction itself (click/drag-to-create,
drag-to-resize, popover), scoped to the plain repeating Monday–Sunday weekly grid only. That
reversal is recorded in
`docs/superpowers/specs/2026-10-09-task-availability-design.md` §14/§15 and designed in
`docs/superpowers/specs/2026-11-02-task-availability-unified-drag-grid-design.md`. Everything
else named above — calendar-date columns, plans, templates, auto-snapshotting — stays
unapproved. This subsection is a pointer for continuity across sessions, not authorization to
start building the REST of Delivery 2 from this pointer alone.

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
- [x] Any active user with Tasks access reads schedules org-wide, regardless of team; a
      no-module user gets no access at all. (`supabase/migrations/20261102164954_widen_weekly_availability_org_wide.sql`
      dropped the team-matching branch of `can_read_weekly_availability()`; RLS e2e: a
      different-team read and a teamless user's cross-user read both now return rows, while a
      no-module user's read still returns `[]`)
- [x] The UI no longer presents task estimates as occupied schedule slots. **Now true**
(re-verified 2026-11-02): `HourSlot`/`ActiveTaskLine` were deleted entirely (`31b20ece`), and
`SolicitudesAvailabilityView`'s header subtitle no longer states the old fixed `9:00–18:00`
schedule — it renders the truthful `tasks.availability.title`/`tasks.availability.sub` keys
(`cf688651`); `rg -n "stratix\.avail\." src` returns zero matches.
- [x] Loading, error, empty, invalid, and save-failure states are explicit. (`AVAILABILITY_VIEW_STATUS`, `editor-state/transitions`, both tested)
- [ ] The experience is keyboard-accessible and usable on narrow screens. **Mostly resolved,
re-verification still genuinely open as of 2026-11-02**: labels, `aria-invalid`/
`aria-describedby`, and native controls are still proven at the unit/DOM level, and a real
Playwright narrow-viewport (390×844) no-horizontal-overflow assertion now exists in
`e2e/task-availability-journey/index.spec.ts` (`be672aec`, updated by `0ce645fd`) — the gap this
item used to describe is closed in code. What's still open is independent confirmation that the
*current* file content actually runs green: `0ce645fd`'s own commit message says that was not
independently re-run that session and asks for a live re-check, which this pass could not safely
perform in this shared worktree (see Task 7 Step 6 above). Leaving unchecked for that reason, not
because the check is missing.
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
