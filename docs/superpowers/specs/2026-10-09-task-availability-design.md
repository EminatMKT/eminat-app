# Tasks Weekly Availability — Design Specification

**Status:** Approved for implementation planning

**Meeting source:** Development meeting transcript, 2026-10-09

**Spec written:** 2026-10-20

**Initial delivery:** Recurring weekly availability only

## 1. Purpose

Replace the current synthetic and hard-to-read availability screen in the Tasks module with a small, truthful weekly schedule that each person can maintain.

The first delivery must answer two questions:

1. When does a person normally work during the week?
2. On each day with declared availability, how many hours has that person scheduled compared with the daily hours defined by their assigned workday (`jornada`)?

This delivery is intentionally limited. It does not attempt to track live presence, completed hours, overtime, meetings, task occupancy, or cross-week balances.

## 2. Current State

The existing route is:

```text
/tasks
  → Requests
  → Availability
```

The current screen does not use persisted schedules:

- availability is visible only to administrators;
- every person is treated as having a fixed 40-hour weekly capacity;
- the assigned `jornada` is ignored;
- the displayed 09:00–18:00 slots are inferred from task workload rather than real working hours;
- the UI does not let a person maintain their own schedule;
- schedule labels and hour slots are not sufficiently legible;
- users can already have a `jornada_id`, and each `jornada` defines `horas_dia`, but Availability does not consume that information.

The new feature must remove the synthetic schedule instead of presenting it as factual availability.

## 3. Product Principles

1. **Show facts, not guesses.** A recurring schedule is user-entered data. Task estimates must not be converted into fake occupied time blocks.
2. **Keep planned and actual time separate.** Availability says when a person normally expects to work; it does not prove that those hours were worked.
3. **Use the workday as a reference, not a save barrier.** A person may temporarily declare fewer or more hours than their assigned workday requires.
4. **Start small and grow deliberately.** Weekly exceptions, balances, approvals, and live task state belong to later deliveries.
5. **Protect permissions in the data boundary.** Hiding an edit control is not sufficient authorization.

## 4. Delivery 1 — Recurring Weekly Availability

### 4.1 User outcome

A person can define their normal weekly availability and the team can read it in a clear schedule.

Example:

```text
My weekly availability                            16 hours declared

Monday                                             8 of 8 hours
09:00–13:00
14:00–18:00  Not available for meetings

Tuesday                                            8 of 8 hours
11:00–15:00  University classes in the morning
16:00–20:00
```

### 4.2 Weekly schedule behavior

A schedule belongs to one user and repeats every week until edited.

For each day of the week, the user may:

- leave the day empty;
- add one time range;
- add multiple time ranges;
- remove a time range;
- set a start time and an end time for each range;
- add an optional free-text note to each range.

**Multiple ranges on the same day are part of Delivery 1.** This supports split schedules such as:

```text
09:00–13:00
14:00–18:00
```

It also supports notes that apply only to a specific portion of the day:

```text
14:00–18:00  Not available for meetings
```

Notes are informational. They do not change the duration of a range and do not have structured statuses in this delivery.

### 4.3 Workday comparison

The assigned `jornada` remains the administrative source for expected **daily** hours:

```text
expected hours for a declared workday = jornada.horas_dia
```

For each day that contains at least one range, the declared daily total is:

```text
declared daily hours = Σ(end time − start time) for that day's ranges
```

The screen must compare each declared day with `jornada.horas_dia`. It may also show the sum of all declared weekly ranges as informational data, but it must not invent a weekly target.

Examples for an eight-hour `jornada`:

```text
Monday    6 of 8 hours · 2 hours below the daily workday
Tuesday   8 of 8 hours · Daily workday complete
Wednesday 10 of 8 hours · 2 hours above the daily workday
Week total: 24 hours declared
```

A daily mismatch produces a visible warning but **does not block saving**.

An empty day produces no mismatch warning because the current data model defines hours per day but does not define which weekdays the person is contracted to work. The system cannot infer a five-day week from `horas_dia` alone.

The daily difference is not a balance and must not be carried into another day or week in Delivery 1.

### 4.4 Validation

A schedule can be saved only when every range is structurally valid.

Required rules:

- start time must be earlier than end time;
- ranges for the same person and day must not overlap;
- touching ranges are allowed, although the UI may suggest combining them;
- a range cannot have zero duration;
- the note is optional;
- the server must enforce the same structural rules as the UI;
- mismatching `jornada.horas_dia` on a day with declared ranges is allowed and produces a warning only.

Example:

```text
09:00–13:00  valid
13:00–17:00  valid; touches the previous range
12:00–15:00  invalid; overlaps 09:00–13:00
18:00–18:00  invalid; zero duration
```

### 4.5 Permissions

Delivery 1 uses the following policy:

| Actor | Read | Edit |
|---|---|---|
| Regular team member | Availability of members of their own team | Their own availability only |
| Administrator | Availability of all relevant users | Their own availability only |
| User outside the team | No access through this view | No access |

Rules:

- team membership must use the existing organizational relationship rather than a manually maintained availability list;
- edit authorization must be enforced by the API/database boundary;
- every user, including an administrator, may edit only their own availability;
- an administrator's broader permission is read-only and exists for organization-wide coordination;
- no user may modify another person's ranges by calling the endpoint directly;
- users without a resolved team must not silently gain organization-wide visibility.

The current screen is admin-only. Delivery 1 expands read access to team members under the policy above.

### 4.6 Empty and incomplete states

#### No schedule

Display:

```text
Availability not configured
```

Do not display synthetic slots.

#### No assigned workday

The person may still save ranges, but the screen must state:

```text
No workday is assigned. Daily hours cannot be compared yet.
```

Declared daily and weekly totals may still be shown.

#### Inactive or missing workday

Treat it as unavailable reference data. Do not silently fall back to 40 hours.

#### Partial schedule

Save it. Show a daily difference only for days that contain ranges; do not warn on empty days.

### 4.7 Read experience

The team view must prioritize scanability:

- person name and organizational context are visible;
- each day has a clear label;
- ranges are ordered chronologically;
- notes are visually associated with their exact range;
- empty days are visually distinct from missing schedule data;
- each declared day shows its declared hours against `jornada.horas_dia`;
- the weekly declared total may be shown without an invented weekly expectation;
- the view must remain usable on narrow screens;
- color may reinforce meaning but must not be the only carrier of information.

The initial implementation does not require a timeline, Gantt chart, or live current-time indicator. A clear weekly list or grid is sufficient.

### 4.8 Editing experience

The simplest acceptable editor is a seven-day form:

```text
Monday
[09:00] [13:00] [Optional note                     ] [Remove]
[14:00] [18:00] [Not available for meetings       ] [Remove]
[+ Add time range]

Tuesday
[+ Add time range]
```

Expected behavior:

- adding a range creates a new row for that day;
- removing a range affects only that row;
- validation appears next to the affected day/range;
- the weekly total updates as ranges change;
- saving is explicit;
- unsaved edits are not presented to teammates as final availability;
- successful saving refreshes the read view with persisted data.

Drag-and-drop editing is not required.

## 5. Data Design

### 5.1 Selected approach

Use normalized per-user recurring time ranges rather than a JSON schedule or columns for each weekday.

Conceptual record:

```text
user_weekly_availability_range
- id
- user_id
- weekday
- starts_at
- ends_at
- note
- created_at
- updated_at
```

Exact database naming is deferred to the implementation plan, but the model must preserve these semantics.

### 5.2 Why ranges belong to the user

The `jornada` defines expected hours, not the exact distribution of those hours.

Two people may both have an eight-hour workday while using different schedules because of classes, other jobs, split shifts, or team needs. Therefore:

- `jornada` remains reusable administrative reference data;
- recurring availability is owned by the user;
- changing one person's schedule must not modify everyone assigned to the same `jornada`.

### 5.3 Why not JSON

A JSON schedule appears cheaper initially but makes these requirements harder:

- overlap validation;
- range-level updates;
- authorization and auditing;
- querying availability by day and time;
- later weekly exceptions;
- relational constraints and test fixtures.

Normalized ranges create a slightly larger initial migration but a simpler growth path.

### 5.4 Forward compatibility

Delivery 1 data represents a recurring template. It must not pretend to be a dated historical record.

Delivery 2 should add dated overrides or weekly schedule instances alongside the recurring template. It should not require replacing the Delivery 1 ranges with a different representation.

Delivery 3 should add actual-time and balance records separately. It must not mutate recurring availability into an attendance ledger.

## 6. Application Boundaries

The implementation should keep these responsibilities separate:

### Availability repository/service

Responsible for:

- reading visible team schedules;
- reading one editable schedule;
- saving one user's recurring ranges;
- enforcing caller permissions;
- returning explicit missing-workday and missing-schedule states.

### Time-range domain utilities

Pure functions responsible for:

- calculating range duration;
- sorting ranges;
- detecting overlaps;
- calculating declared daily and weekly hours;
- comparing each declared day with `jornada.horas_dia`.

These functions must not depend on React or Supabase and should receive direct unit tests.

### Weekly schedule editor

Responsible for:

- adding and removing ranges;
- editing start, end, and note;
- showing local validation;
- showing the running weekly total;
- submitting an explicit save operation.

### Team availability view

Responsible for:

- selecting or listing visible team members;
- rendering persisted ranges;
- displaying declared versus expected hours;
- exposing edit controls only for the authenticated user's own availability.

### Existing workload calculation

Task workload and estimated hours may remain elsewhere in Tasks, but they must not generate schedule slots. If capacity metrics remain visible, they must be visually and conceptually separate from recurring availability.

## 7. Likely Implementation Surface

The implementation plan should verify the exact list, but the expected seams are:

- a new Supabase migration for recurring user ranges, constraints, indexes, and RLS;
- a focused data repository/service for availability;
- a protected route or mutation boundary for saving ranges;
- the existing Availability tab and card/view components;
- pure availability utilities and tests;
- Spanish and English translation keys;
- focused integration or E2E coverage for access and editing.

Relevant existing areas identified during exploration:

- `src/features/tasks/components/solicitudes/SolicitudesTab/`
- `src/features/tasks/components/solicitudes/SolicitudesAvailabilityView/`
- `src/features/tasks/components/solicitudes/MemberAvailabilityCard/`
- `src/features/tasks/utils/availability/`
- `src/shared/context/team-derivations/`
- `src/shared/data/usuarios.ts`
- `src/shared/data/org.ts`
- `src/features/admin/components/OrgManager.tsx`
- `src/features/admin/components/OrgModal.tsx`

The plan should prefer loading availability only when the Availability view or editor needs it, rather than expanding global startup context without evidence that the data is needed globally.

## 8. Acceptance Criteria for Delivery 1

### Recurring ranges

1. A user can add multiple non-overlapping ranges to the same weekday.
2. A user can add an optional note to each individual range.
3. A user can remove a range.
4. Saved ranges persist and repeat as the default weekly schedule.
5. Ranges display in chronological order.

### Hours and workday

6. The UI calculates the total duration of each day's ranges and the informational sum of all weekly ranges.
7. For each non-empty day, the UI compares the daily total with `jornada.horas_dia`.
8. A daily mismatch displays the exact number of hours below or above the daily reference.
9. A daily mismatch does not prevent saving.
10. An empty day does not produce a mismatch warning because the current model does not define contracted weekdays.
11. Delivery 1 does not derive a weekly target by multiplying `horas_dia` by five.
12. No cross-day or cross-week balance is created.

### Validation

13. A range whose end is not after its start cannot be saved.
14. Overlapping ranges for the same user and weekday cannot be saved.
15. The server rejects invalid or overlapping ranges even if client validation is bypassed.
16. Notes do not alter calculated duration.

### Permissions

17. Every user can edit their own schedule.
18. No user, including an administrator, can edit another user's schedule through either the UI or a direct request.
19. A regular user can read schedules for their own team.
20. A regular user cannot gain organization-wide visibility because their team is missing or malformed.
21. An administrator can read all relevant schedules but cannot edit them.

### Truthful UI

22. A person without saved ranges is shown as “Availability not configured.”
23. A person without an assigned workday does not receive a fabricated daily or weekly target.
24. The existing synthetic busy/free time slots are removed from the availability experience.
25. Notes remain associated with the range that owns them.
26. The weekly view is usable on desktop and narrow screens.

## 9. Testing Strategy

### Unit tests

Cover:

- duration calculation;
- daily and weekly declared-total calculation;
- ordering ranges;
- overlap and boundary cases;
- per-day `jornada.horas_dia` comparison;
- missing-workday behavior;
- multiple ranges on one day;
- notes having no effect on duration.

### Data and authorization tests

Cover:

- owner can write their own ranges;
- teammate can read but not write them;
- non-team member cannot read through this feature's policy;
- administrator can read all relevant schedules but can write only their own ranges;
- malformed direct writes cannot create invalid ranges;
- teamless users do not receive broad access;
- deleted users or invalid workday references do not produce fabricated capacity.

### UI/E2E tests

At minimum:

1. open Availability as a regular Tasks user;
2. add two ranges to the same day;
3. add a note to one range;
4. observe the updated daily and weekly declared totals;
5. save one day's ranges below `jornada.horas_dia` and see a non-blocking daily warning;
6. reload and confirm persistence;
7. inspect a teammate's read-only schedule;
8. verify that editing another user is unavailable;
9. verify that an administrator can inspect all relevant schedules but cannot edit another person's schedule;
10. confirm responsive rendering for a narrow viewport.

## 10. Delivery 2 — Weekly Exceptions and Advance Planning

Delivery 2 extends the recurring template without changing its meaning.

Expected capabilities:

- plan a different schedule for a specific week;
- create date-specific exceptions;
- support alternating weekly schedules;
- include weekend ranges where needed;
- plan several upcoming weeks;
- distinguish the recurring template from an override;
- preserve prior weekly schedules as history;
- return to the recurring schedule when no override applies.

Delivery 2 still does not establish actual hours worked or transfer balances between weeks.

## 11. Delivery 3 — Actual Hours, Carryover, and Approval

Delivery 3 introduces operational time accounting as a separate domain.

Expected capabilities:

- compare planned hours with hours actually worked;
- close or approve a week's actual hours;
- carry differences between weeks;
- represent hours worked in advance as a positive balance for the person;
- represent incomplete hours as a negative balance for the person;
- request and approve additional hours;
- correct records with an audit trail;
- define who may approve additional or corrected time;
- prevent recurring availability edits from rewriting historical balances.

Before Delivery 3 is implemented, the team must decide how actual time is captured:

- clock-in/clock-out;
- timers attached to tasks;
- manual declarations;
- automatic state changes;
- or a combination.

That decision requires its own design specification.

## 12. Possible Later Deliveries

Ideas discussed in the meeting that are intentionally not committed to the first three deliveries:

- show the task a person is currently working on;
- overlay tasks and meetings on availability;
- live states such as available, busy, or focused;
- hide confidential task details while still showing “Busy”;
- compare estimated task time with actual duration;
- start a timer when a task enters progress;
- confirm or correct elapsed time when completing a task;
- clock-in and clock-out at the workday level;
- capacity dashboards for leaders and super administrators;
- filters by internal company, external client, department, and team;
- derive production days from hours without storing contradictory values;
- calendar, timeline, or Gantt-style visualization;
- historical workload and capacity metrics;
- notifications for incomplete availability or pending approval;
- an optional future workflow in which each person still edits only their own availability, while an administrator reviews and approves or rejects a submitted change without directly rewriting it.

These are discovery inputs, not requirements. Availability approval is not assigned to Delivery 2 or Delivery 3 yet; it requires a separate product decision after the team has used the self-managed schedule.

## 13. Meeting Discussion Summary

The development meeting established the following context:

1. The current availability area is difficult to read and does not communicate a person's real schedule.
2. The coordination team needs to know who is expected to be working at a given time before assigning urgent work.
3. Being connected to the CRM is not equivalent to working; a person may be active without keeping the application open.
4. Different people have different workdays and may distribute their hours differently.
5. Some schedules change between weeks, and some people may work weekends instead of specific weekdays.
6. Availability should eventually become a clearer time-based view, but the first version should remain small.
7. Hours are a more consistent base unit than “production days,” because one person's workday may contain a different number of hours from another's.
8. The meeting discussed hours completed early, hours owed, and work performed beyond the normal day.
9. Additional hours will eventually require administrative approval and traceability.
10. Task timers, completion confirmation, and clock-out behavior were discussed as possible future mechanisms for actual hours.
11. Estimated time and actual time are different concepts and must not be treated as interchangeable.
12. The team agreed not to build the full operational time system immediately.
13. The explicit near-term direction was to start with availability, validate the experience, and refine it iteratively.
14. Medical work was prioritized before Availability during the meeting; this specification covers only the Availability initiative.

## 14. Explicit Non-Goals for Delivery 1

Delivery 1 does not include:

- weekly or date-specific exceptions;
- schedule history;
- hours carried into another week;
- positive or negative hour balances;
- actual hours worked;
- overtime approval;
- clock-in or clock-out;
- task timers;
- current-task display;
- calendar or meeting integration;
- live presence;
- structured availability statuses;
- production-day calculations;
- payroll calculations;
- task-estimate allocation into schedule slots.

**Reversed 2026-11-02:** drag-and-drop scheduling was listed here as a non-goal, with the
grid/canvas interaction kept out of Delivery 1 and pointed at an unapproved Delivery 2 instead
(`docs/superpowers/plans/2026-10-20-task-weekly-availability.md`). The product owner reversed
that call explicitly: Delivery 1's weekly grid is rebuilt as the drag/click/resize interaction
from `weekly-availability-grid-prototype.html`, scoped to the plain repeating Monday–Sunday
grid only — the prototype's calendar-date/plan/template parts stay Delivery 2, unapproved. See
`docs/superpowers/specs/2026-11-02-task-availability-unified-drag-grid-design.md` for the design.

## 15. Decision Record

| Decision | Outcome |
|---|---|
| Initial schedule model | Recurring weekly schedule |
| Ownership | Per user, not per `jornada` |
| Multiple ranges per day | Included in Delivery 1 |
| Range annotations | Optional free text in Delivery 1 |
| Structured statuses | Deferred |
| Exact match with expected hours | Warning only; saving remains allowed |
| Weekly exceptions | Delivery 2 |
| Carryover and positive/negative balances | Delivery 3 |
| Team visibility | Team members may read their team; administrators may read all relevant schedules; every user edits only their own availability |
| Synthetic task-based time slots | Remove from the Availability experience |
| Actual work tracking | Separate future domain, not inferred from availability |
