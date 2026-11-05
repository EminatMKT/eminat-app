# Tasks Weekly Availability — Unified Drag-Grid Design

**Status:** Approved for implementation. The governance conflict in section 0 (and Open Question
1 in section 4) was resolved by the product owner on 2026-11-02: the drag/pixel grid is pulled
into Delivery 1, scoped exactly as section 1 describes. The reversal is recorded in
`docs/superpowers/specs/2026-10-09-task-availability-design.md` §14/§15 and
`docs/superpowers/plans/2026-10-20-task-weekly-availability.md`'s "What follows: Delivery 2"
section.

**Scope:** Delivery 1 (recurring weekly "habitual" schedule) only. Corrects the gap between the
product owner's prototyped interaction and what Delivery 1 shipped. Does not touch Delivery 2
(dated plans, templates, calendar columns).

**Written:** 2026-11-02

**Inputs:**
- `~/.local/share/todo/eminat-app/attachments/2026-10-30-delivery-2-planned-schedules/weekly-availability-grid-prototype.html`
  (canonical prototype — covers both Delivery 1's typical week and Delivery 2's calendar-dated
  plans in one file)
- `docs/superpowers/specs/2026-10-09-task-availability-design.md` (Delivery 1 approved spec)
- `docs/superpowers/plans/2026-10-20-task-weekly-availability.md` (Delivery 1 implementation plan
  and its "What follows: Delivery 2" pointer, lines 2024–2052)
- Current Delivery 1 implementation under
  `src/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/`,
  `src/features/tasks/components/solicitudes/AvailabilitySchedule/`,
  `src/features/tasks/components/solicitudes/MemberAvailabilityCard/`,
  `src/features/tasks/components/modals/MemberAvailabilityModal/`,
  `src/shared/components/weekly-schedule/`

**Implementation status (2026-11-04):** There is substantial real commit history on this branch
already — it is not true that nothing here is committed. Recent commits, among many others
further back, include `bee148ea` (the `Block` component, Task 4), `9977c53c` (`DayCaption`, Task
8), `26f495ba` (`AddRangeControl`, part of Task 7), `51a70952` (the fix for an
`editor-view-model` regression described below), through `5dd1a926` (the `RangeField` textarea
note field) at current HEAD. Only the most recent work from tonight's session sits uncommitted,
queued in `.pending-commits` awaiting Wagner's approval through the mechanical
`AskUserQuestion` gate: `fields-view/index.tsx`, `Popover/index.test.tsx`, and this doc's own
status edits.

Tasks 1–4 of the 13 in section 3 are done, verified against the actual files and tests rather
than assumed: (1) the geometry/minute-math module, (2) the explicit-time create/resize
editor-state actions, (3) the simplification of `projectDayErrors` to a direct
`{errors, rangeIndex}` lookup — its brief regression in `editor-view-model/index.ts`, which still
called `projectDayErrors` with the old shape, was already fixed by restoring the local
day-position error remap in commit `51a70952`, re-verified clean tonight with 0 `tsc` errors, 2/2
`editor-view-model` tests, and 68 files / 224 tests passing across the whole
`src/features/tasks/components/solicitudes/` scope — and (4) the `Block` component, committed in
`bee148ea` with its own `ResizeHandle/`, `accessible-label/`, `activation-key/`, `geometry/`, and
`note-lines/` helpers.

Task 5 (the Popover) has every supporting piece done and verified — `controller/`,
`popover-fields/`, `fields-input/`, `fields-view/`, `PopoverFooter/`, `confirm-removal/`,
`draft/`. `Popover/index.test.tsx` is written and correct, using the `vi.hoisted()` i18n-mock
pattern that `PopoverFooter/index.test.tsx` already proved. `Popover/index.tsx` itself is
blocked: its verified-correct content hard-fails two Centinela detectors in `ts/ihc.md` —
`risky_flow_cancel_affordance` and `dialog_validation_focus_management` — neither of which
credits cancel or focus-management evidence that is genuinely present but composed through child
components rather than written inline in the same file's own JSX (`PopoverFooter` renders the
Cancel button; `Modal` owns focus through its `useDialog` hook). This has been escalated to the
Centinela plugin maintainer as a detector gap needing a code fix, not a workaround — there is no
attestation path for this check, and signing an exemption is off the table per standing policy.
The task is waiting on that fix.

Task 6 (gesture wiring — pointer create/resize) has not started; no pointer-event code exists
anywhere under `AvailabilityWeekGrid/`. Task 7 (the keyboard add-range affordance) is partially
done: `AddRangeControl/index.tsx`, plus its `next-slot/` and `first-free-window/` helpers, is
built and tested — a button that finds the next free range and calls `onAdd(slot)`, disabling
itself with a reason when no room is left — but it is not yet composed inside `DayCaption`'s
layout, and its `onAdd` callback is not yet wired to actually open the Popover; that remaining
integration likely lands alongside Task 9's assembly. Task 8 (the column header) is done as a
standalone component: `DayCaption/index.tsx` renders the weekday label plus the
`compareDailyHours`/`comparisonCopyVars`/`STATUS_COPY_KEYS` comparison badge through the shared
`HoursStatus` component, matching the design doc's Task 8 test requirements, but it is not yet
mounted into the assembled grid — that is Task 9's job, not Task 8's. Task 9 (assembling
`AvailabilityWeekGrid`) has not started: no top-level `AvailabilityWeekGrid/index.tsx` exists
yet. It is genuinely the next real integration point — composing `Block`, `DayCaption`, and
`AddRangeControl` (wiring its `onAdd` into state and the Popover once Task 5 unblocks), plus
whatever Task 6 produces. Tasks 10–13 and the relocation to `src/shared/components` are
unchanged from before: still not started, still gated the same way — relocate after Task 9; Task
10 (rewiring `WeeklyAvailabilityEditor`) and Task 11 (rewiring `MemberAvailabilityModal`) run in
parallel with each other once the relocation lands; Task 12 (the e2e journey) needs both; Task 13
(i18n/CSS gates plus the full suite) closes.

The dependency picture is simpler than a previous version of this section claimed: Task 7 and
Task 8 do not share a file and were never forced to sequence against each other — they were
built as two separate, independently-tested components (`AddRangeControl/` and `DayCaption/`),
which is exactly why both already exist without conflict. What remains genuinely blocked is
this: Task 6 and the rest of Task 7's integration both want Task 5 (the Popover) unblocked
first, so that wiring can be tested against the real component instead of a mock; Task 9 needs
Task 6 and the rest of Task 7 done, plus Task 5. There is not much left that is parallel-safe
right now beyond finishing the pieces of Task 7's integration that do not require the Popover to
exist yet — composing `AddRangeControl` into `DayCaption`'s layout, for instance, can happen
before `onAdd` can open a real Popover — though that is a narrow opening, not a fully unblocked
lane.

## 0. The governance conflict this doc must surface first

Before any interaction or architecture detail: **the codebase's own planning record says the
drag/pixel grid this doc designs is Delivery 2 scope that has not been approved**, and that
starting it is explicitly out of order.

- `docs/superpowers/specs/2026-10-09-task-availability-design.md` section 14 lists drag-and-drop
  scheduling as an **explicit non-goal of Delivery 1** (line 563), and section 4.8 states that
  drag-and-drop editing is not required (line 245) — the seven-day form of rows and
  `<input type="time">` fields is the spec's own accepted minimum.
- `docs/superpowers/plans/2026-10-20-task-weekly-availability.md` lines 2034–2039 attributes the
  grid/canvas component itself to **a future Delivery 2 plan**: no reusable grid/canvas component
  exists anywhere in this codebase yet, and one would need to be built from scratch; line 2050
  states in bold that Delivery 2 is not approved scope, and that this is a pointer for continuity
  across sessions, not authorization to start building it.

This design doc was still commissioned and is written as instructed — the premise handed down is
that the product owner's prototype is the source of truth for how the *habitual* weekly grid
should behave, Delivery 2's calendar-date/plan/template layer aside, and that today's row-list
implementation diverged from that intent. That premise and the plan doc's explicit "not approved,
don't start building it" are in direct tension. **This is flagged as Open Question 1 below and
must be resolved by the product owner before any task in section 3 starts** — this doc is scoping
work for a decision, not pre-authorizing it.

## 1. Target interaction

Verified against the prototype's `renderGrid`/`buildBlock`/`paintBlock`/`wireDrag`/`wireResize`/
`openPopover` functions (weekly-availability-grid-prototype.html, lines 1110–1605), restricted to
the typical-week (`weekday`) path — `isCalendarEditor()`/`calendarDays()`/dated-plan branches are
Delivery 2 and excluded throughout.

### 1.1 Grid shape

- Seven day columns (Monday–Sunday, ISO weekdays 1–7, matching `AVAILABILITY_DAYS` in
  `src/features/tasks/utils/availability/day-labels.ts`), one time-of-day gutter, hour lines full
  height, half-hour lines dashed. 24-hour range (`START_HOUR=0`, `END_HOUR=24`), 30-minute snap
  (`SNAP_MIN=30`). Pixel density (`PX_PER_MIN`) is a rendering constant, not a product decision.
- Each declared range renders as one absolutely positioned block (`paintBlock`): top/height from
  minutes since midnight, a time label (`HH:mm–HH:mm`), and the note truncated to fit the block's
  height (`--note-lines` computed from the block's pixel height, prototype lines 1197–1215).

### 1.2 Create

- **Click** on empty space in a day column: `freeWindow()` finds the open interval around the
  click point; if there is room, create a block of `min(60min, available room)` minutes, snapped
  down to the half hour, biased to end before the click point lands against an existing block's
  edge (prototype `creationRange`, lines 1318–1331). No popover opens on bare click — the block is
  created immediately and selectable afterward. **Open question** — see section 4.2: should
  Delivery 1 open the popover immediately after a click-created block, to collect the mandatory
  exact time and optional note in one step, rather than requiring a second click? The prototype
  does not open it automatically for click; it does for drag-create (`finishGesture`, line 1379).
- **Drag** across a day column: free-form range bounded by neighboring blocks and day edges,
  snapped to 30 minutes on both ends (`creationRange`, `g.moved` branch). On release, the popover
  opens pre-filled with the dragged start/end for confirmation and an optional note
  (`finishGesture`, line 1380).
- A click or drag that starts inside an already-occupied window is rejected before the gesture
  starts (`wireDrag`'s `freeWindow` check, line 1309) — no overlapping block can ever be created
  through direct manipulation.

### 1.3 Resize

- Each block has top and bottom edge handles (`resize-handle`, `wireResize`). Dragging one moves
  only that edge, snapped to 30 minutes, clamped against the block's own minimum duration (30 min)
  and against the day's neighboring ranges (`resizeBounds`, lines 1265–1274). The opposite edge
  never moves.
- Resize commits immediately on pointer release — no popover round-trip (`finishGesture`'s
  `resize` branch, lines 1371–1378).

### 1.4 Exact edit — the popover

- Clicking an **existing** block opens the same popover used for drag-create confirmation, now in
  `edit` mode: start time, end time (a `<select>` in 30-minute steps so the end-of-day boundary is
  representable — `<input type="time">` cannot hold it), and a note textarea with a character
  counter. A delete control removes the range. Save/Cancel behave as expected; Save is disabled
  until something actually changed (`updatePopoverConfirmState`, lines 1531–1541).
- Validation inside the popover re-checks start-before-end, 30-minute alignment, and non-overlap
  against the day's *other* ranges before allowing confirm (`validatePopover`, lines 1543–1569) —
  this duplicates, at the single-range scope, exactly what
  `src/features/tasks/utils/availability/validate-ranges/index.ts` already does at the whole-week
  scope. The grid's popover validation should call into existing `validateRanges`/`hasOverlap`
  (via a day-scoped slice of the current ranges), not reimplement the min/max/snap arithmetic a
  second time.

### 1.5 Read-only mode (`readOnly`/`!canEdit`)

- `isReadOnly()` is one boolean gate, threaded everywhere: day columns drop the pointer-create
  cursor and get no drag listener (line 1162); blocks get no resize handles (line 1187) and an
  extra read-only visual treatment (dashed border, line 196); clicking a block still opens the
  *same* popover component, but in a view mode — inputs disabled, note read-only, no save/delete,
  just a close control (`openPopover`, lines 1433–1467).
- This is the one piece of the prototype that already matches this repo's stated intent in
  `MemberAvailabilityModal/index.tsx`'s own doc comment (lines 17–19): same component, same
  content either way, never a second shell for "view" vs "edit." The prototype achieves it with
  one `readOnly` boolean through one render path; the current implementation does not (see section
  2.1).

### 1.6 Explicit deviations from the prototype (not open questions — already decided by the approved Delivery 1 spec)

The prototype is Delivery-2-authored and carries artifacts that conflict with the *already
approved* Delivery 1 design. These are not ambiguous and should not be re-litigated as open
questions:

1. **No invented weekly target.** The prototype's toolbar pill compares `declaredTotal` against a
   hardcoded `EXPECTED_WEEKLY_MIN = 40 * 60` (line 536) and colors a badge by that comparison
   (`renderSummary`, lines 1098–1108). Delivery 1's spec explicitly forbids this: it does not
   derive a weekly target by multiplying `horas_dia` by five (acceptance criterion 11), and the
   current `editor-view-model`'s `weeklySummary` already correctly carries only `declaredHours`,
   no target
   (`src/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/editor-view-model/index.ts:31`).
   The new grid's toolbar must keep showing only the declared weekly total, never a 40h (or any
   other invented) expectation.
2. **Per-day `jornada.horas_dia` comparison must be added — the prototype has none.** The
   prototype's column headers are a bare weekday short-name plus date (`grid-col-head`, line
   1120–1125); it has no concept of `jornada` at all, because the Delivery 2 prototype predates
   or ignores that Delivery 1 requirement. The current `DaySection` already renders this
   comparison per day via `compareDailyHours`/`comparisonCopyVars`/`STATUS_COPY_KEYS`
   (`src/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/DaySection/index.tsx:33-49`).
   The grid's column headers must carry this same per-day comparison text/badge — it cannot be
   silently dropped when the row list disappears.
3. **Note length is 280, not 300.** The prototype's `NOTE_MAX_LENGTH = 300` (line 532) disagrees
   with the already-implemented, already-approved limit:
   `RangeField/constants.ts:5` sets `noteMaxLength: 280`, matching the Delivery 1 plan's scope
   guard (optional note per range, limited to 280 characters,
   `docs/superpowers/plans/2026-10-20-task-weekly-availability.md:24`). Keep 280.
4. **Multi-tenant/plans chrome is out.** The team strip, the personal-plans list dialog, save-
   as-template, apply-template, and date-bound plan fields (`plansScrim`, `applyPromptScrim`,
   `deletePromptScrim`, `editorDetails`, `planFields`, everything behind `isCalendarEditor()`) are
   Delivery 2. None of it is built; the grid only ever renders the one recurring weekly schedule.

### 1.7 Keyboard accessibility — a real gap in the prototype, not something to inherit silently

The prototype is correctly keyboard-operable for **reading and editing an existing block's exact
time**: every block is a real focusable element (`tabIndex=0`, `role="button"`, prototype line
1171) with an `aria-label` carrying its time range and note (`paintBlock`, line 1214), Enter/Space
opens the same popover a click would (lines 1180–1185), and the popover's own controls are native
`<input type="time">`/`<select>`/`<textarea>` — all keyboard-native. Tab order is trapped inside
whichever dialog is open (the global `keydown` handler's focus-trap, lines 1682–1693).

What the prototype has **no keyboard path for at all** is the two gesture-only interactions:
creating a brand-new range (click or drag on an empty area of a day column), and resizing an
existing range (dragging an edge handle). Both are pointer-only (`pointerdown`/`pointermove`
listeners, no `keydown` equivalent anywhere in `wireDrag`/`wireResize`). This is a genuine
accessibility regression relative to today's shipped editor, which is 100% keyboard-operable
because every range is a row of native `<input>` elements (confirmed by Task 5's own test list —
preserve keyboard navigation with native time/text inputs and buttons,
`docs/superpowers/plans/2026-10-20-task-weekly-availability.md:1258` — and its own acceptance item
13, that the experience is keyboard-accessible and usable on narrow screens).

Proposed fix, kept deliberately small rather than building a full ARIA grid/roving-tabindex
pattern:

- **Create, by keyboard:** each day column keeps one visible, always-focusable "add range"
  affordance — the same role `DaySection/AddRangeButton` plays today, just relocated to the grid
  column (e.g. rendered under/over the column, or as a persistent small button in the column
  header). Activating it computes the day's first free window via the same `freeWindow` logic the
  prototype uses for click, and creates a block there (capped at 60 minutes, or the whole free
  window if shorter) — functionally identical to a mouse click at the top of the day. The popover
  then opens for exact-time confirmation, same as drag-create.
- **Resize, by keyboard:** no separate keyboard-drag is needed. Focusing an existing block and
  pressing Enter/Space already opens the popover (inherited unchanged from the prototype); typing
  an exact start/end time there *is* the keyboard equivalent of dragging an edge handle — it
  reaches the same end state (a changed `startsAt`/`endsAt`) through a fully native, already
  keyboard-operable form. No pointer-only capability is lost as long as the popover's time fields
  remain reachable without ever touching a resize handle.
- This keeps the one-grid/one-popover architecture intact (section 2) and adds exactly one new
  keyboard-reachable control per day column, rather than reinventing the grid as an ARIA
  `role="grid"` of focusable half-hour cells. See Open Question 4 (section 4) for whether this
  minimal fix is sufficient or the product owner wants the richer pattern.

## 2. Component architecture

### 2.1 What exists today and why it diverged

Two **entirely separate component trees** render one person's week, verified by reading both in
full:

- **Edit tree** (`canEdit === true`): `WeeklyAvailabilityEditor` →
  `WeeklyAvailabilityEditorComposition` → seven `DaySection`s, each a `<section>` with a label, a
  per-day hours-comparison line, and a list of `AvailabilityRangeItem` rows — each row is two
  `RangeField` time inputs plus one note `RangeField` plus a guarded remove `Button`
  (`AvailabilityRangeItem/index.tsx:12-28`). Purely a row-list form; no absolute positioning, no
  pointer gestures.
- **Read tree** (`canEdit === false`): `AvailabilitySchedule` → `WeeklySchedule` (in
  `src/shared/components/weekly-schedule/`) → one `ListaRotulada` per weekday with plain
  `rangesText` and an `HoursStatus` badge (`weekly-schedule/index.tsx:7-21`). Text lines, not even
  a grid.

`MemberAvailabilityModal/index.tsx` branches between the two at lines 30-32
(`member.canEdit ? <WeeklyAvailabilityEditor .../> : <AvailabilitySchedule .../>`) — directly
contradicting its own doc comment two lines above, which already claims this modal unifies view
and edit into the same component, same content either way, never a second shell. The folder
`src/shared/components/weekly-schedule/` is itself very recent work (untracked in this worktree
per `git status`, introduced by commit `0ce645fd` "unify availability view/edit into one modal")
— it already tried to unify the *read-only presentation shape* (one shared line-renderer instead
of ad hoc markup), but it never attempted to unify *editable and read-only* into one tree, and it
is not a grid at all. This design corrects the actual target that commit's own message named but
did not reach.

### 2.2 Where the new component lives

**Decision, reversed 2026-11-02: moves to `src/shared/components/`, not kept `tasks`-local.**

This section originally argued for keeping the grid inside
`src/features/tasks/components/solicitudes/`, reasoning that no second module had a known need
for an hour-axis drag grid yet. The product owner corrected that premise directly: Disponibilidad
was already planned to be inserted inside Team (Equipo) — see the nav move recorded separately
(`src/features/tasks/components/team/TeamSubNav/`, built in the
`.claude/worktrees/agent-a2dd2cf0447831c41` worktree) — which makes Team a second real consumer of
this same leaf, not a hypothetical one. That satisfies this repo's own stated convention
(`docs/superpowers/specs/2026-08-29-reuniones-design.md:1006`,
`docs/superpowers/plans/2026-09-03-modulo-tasks.md:2201`) on its own terms: a component moves to
`src/shared/` once a second consumer asks for it.

**Sequencing:** the build already in progress when this was corrected started under
`src/features/tasks/components/solicitudes/AvailabilityWeekGrid/` — by explicit product-owner
instruction, that build finishes where it started rather than being redirected mid-flight. The
relocation to `src/shared/components/AvailabilityWeekGrid/` (updating every import, re-verifying
`tsc`/`vitest`) is a follow-up step after this build is verified, not a change to this build's
task list.

### 2.3 Shape of the new component

```
AvailabilityWeekGrid
  props: { ranges: WeeklyAvailabilityRange[] (+ clientId when editable), workday, readOnly, onChange }
  renders: time gutter + 7 day columns (grid-col-head carries weekday label + the day's
           compareDailyHours comparison, per section 1.6 item 2) + one block per range
           (paintBlock-equivalent) + the popover (always mounted, conditionally open)
  when !readOnly: wires click/drag-to-create and edge-resize per day column; blocks get resize
    handles and are tabbable; a visible "add range" control per column (section 1.7) is
    keyboard-reachable create
  when readOnly: no pointer listeners, no resize handles, no "add range" control; blocks remain
    tabbable and open the same popover in view mode
```

Internally this still wants the repo's usual one-function-per-file decomposition (geometry/minute
math, gesture state machine, popover view model, block component) rather than one large file — the
task breakdown in section 3 sequences that split.

### 2.4 File disposition

**Survives unchanged** — pure data/business logic, verified to have zero DOM or row-list coupling:

| File/folder | Why it survives |
|---|---|
| `src/features/tasks/utils/availability/*` (`duration-hours`, `validate-ranges`, `has-overlap`, `sort-ranges`, `declared-hours-by-day`, `declared-weekly-hours`, `compare-daily-hours`, `comparison-copy-vars`, `count-invalid-ranges`, `day-labels`, `minutes`, `types`) | Operates purely on `{weekday, startsAt, endsAt, note}` data (confirmed reading `validate-ranges/index.ts`, `compare-daily-hours`, `declared-hours-by-day` call sites) |
| `src/features/tasks/data/availability/*` (`types.ts`, `fetch-visible/`, `save-own/`) | DTOs and the self-replace PUT are render-agnostic; no shape change needed |
| `WeeklyAvailabilityEditor/controller/index.ts`, `save-cycle/`, `resolve-save-outcome/`, `save-decision/`, `initial-state/` | Keys state by `clientId`, not DOM/array position (confirmed `controller/index.ts:28-51`); save lifecycle is identical regardless of how ranges are drawn |
| `WeeklyAvailabilityEditor/save-flow/*` | Pure validate-then-call-API facade (`save-flow/index.ts:14-32`), no rendering assumption |
| `WeeklyAvailabilityEditor/range-index/*` | Resolves a range by `clientId` (`range-index/index.ts:7-12`), independent of layout |
| `WeeklyAvailabilityEditor/editor-state/clear-stale-feedback/`, `toSaveRanges` in `editor-state/index.ts` | Data transforms, no markup |
| `RangeField/*` (incl. `Counter/`) | Generic labeled-input-plus-counter; reused **inside the new popover** for start/end/note, not deleted |
| `AvailabilityRangeItem/view-model/fields/*`, `view-model/fields/note-counter/*`, `view-model/range-error-copy/*` | Translation/formatting logic for exactly the fields the popover still needs (start/end/note copy, error copy, counter text) — relocate into the popover's own view-model, logic unchanged |
| `AvailabilityRangeItem/confirm-removal/*` | The confirm-gated removal guard the popover's delete control still wants |
| `MemberAvailabilityCard/*` | Team-strip card showing name plus weekly total only; never rendered ranges itself (`MemberAvailabilityCard/index.tsx:35-55`) |
| `EditorActions/*`, `editor-feedback/*` | Generic cancel/save controls plus weekly-total/status feedback bar; already render-agnostic (`EditorActions/index.tsx`, `editor-feedback` producing `weeklySummary`/`validationMessage`/`actions`) |

**Rewritten** — same responsibility, different internals because the render target changed:

| File/folder | What changes |
|---|---|
| `WeeklyAvailabilityEditor/index.tsx` | Swaps `buildDayElements` plus seven `DaySection`s for mounting `AvailabilityWeekGrid` with `readOnly={false}`; keeps `useWeeklyAvailabilityEditorController` wiring |
| `WeeklyAvailabilityEditor/editor-view-model/*` | Keep the per-day grouping shape (`monday..sunday`, each with `ranges`/`errors`/`expectedHours`) — it now feeds grid columns instead of `DaySection` props; no change to its math, only its consumer |
| `WeeklyAvailabilityEditor/WeeklyAvailabilityEditorComposition/*` | Body becomes the grid plus toolbar/summary instead of the seven stacked sections; keeps validation banner plus `actions` footer unchanged |
| `WeeklyAvailabilityEditor/controller/range-actions/index.ts`, `editor-state/transitions/*`, `types.ts` (`AddRangeAction`) | `AddRangeAction` currently only carries `{ kind: 'add', weekday }` (adds a blank row) — must grow to carry explicit `startsAt`/`endsAt` from a click/drag/keyboard-create point. `ChangeRangeAction` (single-field, index-addressed) likely still works for the popover's save (dispatch for `startsAt`, `endsAt`, `note`), but needs new tests proving a resize/popover-save round-trip behaves identically to today's per-field edits |
| `WeeklyAvailabilityEditor/project-day-errors/*` | Currently remaps a global `rangeIndex` into **local list position within a day** (`project-day-errors/index.ts:13-20`) — a row-list-only concept. A grid addresses each block directly by its range/`clientId`, so this needs to become a direct `rangeIndex`→error (or `clientId`→error) lookup feeding one block/popover, not a "Nth row of this day" projection |
| `MemberAvailabilityModal/index.tsx` | Drops the `member.canEdit ? Editor : Schedule` branch entirely; always mounts one component (the editor shell wrapping `AvailabilityWeekGrid` with `readOnly={!member.canEdit}`) — this finally fulfills the doc comment already sitting at lines 17-19 |

**Deleted** — superseded outright, nothing left to reuse:

| File/folder | Replaced by |
|---|---|
| `WeeklyAvailabilityEditor/day-elements/*` | Grid column building lives inside `AvailabilityWeekGrid`, fed by the kept `editor-view-model` |
| `WeeklyAvailabilityEditor/DaySection/*` (`index`, `DaySectionContent`, `AddRangeButton`, `render-range`, `constants`, `types`) | Grid day columns plus the relocated "add range" affordance (section 1.7); the row-list rendering concept itself is gone |
| `WeeklyAvailabilityEditor/AvailabilityRangeItem/index.tsx`, `AvailabilityRangeItemFrame/*` | The row frame layout has no equivalent — blocks are painted directly by the grid; only the *view-model* pieces listed above survive, relocated |
| `AvailabilitySchedule/*` (`index.tsx`, `index.test.tsx`, `day-line/*`) | `AvailabilityWeekGrid` with `readOnly={true}` |
| `src/shared/components/weekly-schedule/*` (`index.tsx`, `types.ts`, `index.test.tsx`) | Confirmed single consumer is `AvailabilitySchedule/index.tsx:6` — once that's deleted this has no caller and must go too, not linger as dead shared code |

**New:**

| File/folder | Purpose |
|---|---|
| `AvailabilityWeekGrid/index.tsx` plus decomposed internals (geometry/minute-math module, gesture-state module, `Block`, `Popover`, column header) | The one grid-rendering leaf, `readOnly` threaded through |
| `AvailabilityWeekGrid/Popover/*` | Exact-time/note editor and viewer, built from the relocated `AvailabilityRangeItem` view-model pieces plus `RangeField` plus `confirm-removal` |

## 3. Task breakdown (TDD-ordered, sized for subagent execution)

Every task writes its test file before its implementation, per this repo's own convention. This
breakdown assumes Open Question 1 (section 4) has been answered yes by the product owner — do not
start Task 1 before that.

1. **Geometry/minute-math utilities.** Write
   `AvailabilityWeekGrid/geometry/index.test.ts` covering: minute-to-pixel conversion, 30-minute
   snap/snap-down/snap-up, `freeWindow` (open interval around a point, respecting existing ranges
   on that day), `resizeBounds` (clamped neighbors for an edge drag), and the click-create default
   (`min(60min, free room)`, snapped). Then implement `geometry/index.ts`. Pure functions, no
   React, ported from the prototype's `pointerMinute`/`snap`/`snapDown`/`snapUp`/`freeWindow`/
   `resizeBounds`/`creationRange` (lines 1229–1331), adapted to operate on `WeeklyAvailabilityRange[]`
   rather than the prototype's ad hoc `state.ranges`.

2. **Extend editor-state actions for explicit-time create and resize.** Write new cases in
   `WeeklyAvailabilityEditor/editor-state/transitions/index.test.ts` for: creating a range with an
   explicit `startsAt`/`endsAt` (not just a blank default), and updating an existing range's
   `startsAt` plus `endsAt` together (the resize/popover-save case). Then extend `types.ts`'s
   `AddRangeAction` (and `ChangeRangeAction` usage, or a new action kind if the two-field update
   proves awkward as two dispatches) and `editor-state/transitions/index.ts` accordingly. Keep
   `range-actions/index.ts` and `range-index/*` compiling against the new shapes.

3. **Rework `project-day-errors` into a direct range/`clientId` lookup.** Write
   `project-day-errors/index.test.ts` cases proving an error attaches to the exact range it
   belongs to without any "local day position" concept. Implement the simplified lookup; delete
   the local-index projection logic.

4. **Block component.** Write `AvailabilityWeekGrid/Block/index.test.tsx` covering: correct
   top/height from start/end minutes, time label text, note truncation at small heights,
   `readOnly` suppressing resize handles and adding the read-only visual/aria state, keyboard
   Enter/Space opening the popover, accessible label matching time plus note (plus a "view only"
   suffix when read-only). Implement `Block/index.tsx`, porting `paintBlock`'s pixel math onto the
   geometry module from Task 1.

5. **Popover component.** Write `AvailabilityWeekGrid/Popover/index.test.tsx` covering: edit mode
   (start/end/note fields, save disabled until changed, delete control, overlap/invalid-time
   errors rendered via the existing `validateRanges`/day-slice, not reimplemented math), create
   mode (prefilled from a drag or keyboard-create gesture), and view mode (`readOnly`: all fields
   disabled, no save/delete, only close). Implement `Popover/index.tsx` by relocating
   `AvailabilityRangeItem/view-model/fields/*`, `note-counter/*`, `range-error-copy/*`, and
   `confirm-removal/*`, composed with `RangeField`.

6. **Gesture wiring (pointer create plus resize).** Write
   `AvailabilityWeekGrid/gestures/index.test.tsx` (or colocated in the grid's own test) covering:
   click-create (no drag) produces a bounded 1h-or-less block and does not open the popover
   immediately unless Open Question 2 says otherwise; drag-create opens the popover prefilled on
   release; edge-drag resizes and commits on release without a popover; a gesture started over an
   occupied point is a no-op; `readOnly` disables all of the above. Implement using Pointer Events
   (`pointerdown`/`pointermove`/`pointerup`/`pointercancel`/`lostpointercapture`), one capture per
   gesture, ported from `wireDrag`/`wireResize`/`updateGesture`/`finishGesture` (lines 1276–1409).

7. **Keyboard "add range" affordance.** Write a test proving a day column's add control creates a
   range in the day's first free window and opens the popover, matching section 1.7's proposed
   fix. Implement it inside the grid's column header, reusing the geometry module's `freeWindow`.

8. **Column header with per-day hours comparison.** Write a test proving each column header shows
   the weekday label *and* the `compareDailyHours`/`comparisonCopyVars` text/badge for that day
   (section 1.6 item 2), matching what `DaySection` shows today. Implement the header, reusing
   `compareDailyHours`/`comparisonCopyVars`/`STATUS_COPY_KEYS` unchanged.

9. **Assemble `AvailabilityWeekGrid`.** Write `AvailabilityWeekGrid/index.test.tsx` as the
   integration test for the whole leaf: renders 7 columns plus gutter, places blocks from
   `ranges`, wires create/resize/popover when `!readOnly`, suppresses them when `readOnly`, shows
   the weekly declared-total toolbar with **no invented weekly target** (section 1.6 item 1).
   Implement `index.tsx` composing Tasks 1–8's pieces.

10. **Rewire `WeeklyAvailabilityEditor`.** Update
    `WeeklyAvailabilityEditor/index.test.tsx` to exercise the grid instead of `DaySection` rows
    (add/resize/edit/remove through the new interaction, same assertions on save payload and
    validation messages Task 5 of the original plan already proved). Update
    `WeeklyAvailabilityEditorComposition` and `index.tsx` to mount `AvailabilityWeekGrid`. Delete
    `day-elements/*` and `DaySection/*` once nothing imports them (confirm with a repo-wide search).

11. **Rewire `MemberAvailabilityModal`.** Update `MemberAvailabilityModal/index.test.tsx` to prove
    one component tree handles both `canEdit` states via `readOnly`, not a branch to two different
    components. Update `index.tsx` to drop the `AvailabilitySchedule` branch. Delete
    `AvailabilitySchedule/*` and `src/shared/components/weekly-schedule/*` once a repo-wide search
    confirms no remaining import.

12. **Full browser journey (replaces/extends the existing Playwright coverage).** Update the
    existing weekly-availability e2e spec (added by commit `be672aec`) to drive the new
    interaction end to end: create by drag, resize by edge-drag, edit by popover, delete, and the
    read-only teammate view — plus one keyboard-only pass proving Task 7's add-affordance and the
    Enter-to-edit path remain fully operable without a pointer.

13. **i18n and CSS gates.** Add/adjust translation keys for the popover's labels (currently
    `EDITOR_COPY.*`, `RANGE_FIELD_CONSTANTS`-driven) and the new grid's own strings (add-range
    label, read-only hint). Run `pnpm lint:css`, `pnpm typecheck`, and the full
    `src/features/tasks/components/solicitudes/` test suite as the closing gate.

## 4. Open questions for the product owner

1. **Governance — RESOLVED 2026-11-02.** The product owner confirmed the drag/pixel grid is
   authorized for Delivery 1, reversing the non-goal in both documents (see the Status line
   above). Task 1 may start.

2. **RESOLVED (default, reversible):** keep the prototype's own asymmetry — click creates a fast
   default block with no popover, drag opens the popover prefilled on release. It's the literal
   source-of-truth behavior and a one-line change in Task 6/9 if it turns out wrong after a real
   try; not worth a second round-trip to decide in the abstract.

3. **Note length: 280 (current) or should it change?** Section 1.6 item 3 resolves this in favor
   of the already-shipped 280-character limit as the safe default, but confirm the product owner
   did not intend the prototype's 300 as a deliberate increase.

4. **Is the minimal keyboard fix in section 1.7 sufficient, or is a richer pattern wanted?** The
   proposed fix (one "add range" button per day, Enter-to-edit on existing blocks) restores full
   keyboard operability without building an ARIA grid of focusable time-slot cells. A richer
   pattern (for example arrow-key-navigable half-hour cells, matching some calendar apps'
   accessible grid pattern) is possible but meaningfully more expensive to build and test. Confirm
   the minimal fix is acceptable before Task 7 is scheduled.

5. **Should a user be able to view their own schedule in read-only mode while an edit is
   in-flight elsewhere (e.g. two tabs)?** Not something this doc invents a risk for — no evidence
   of a concurrent-edit scenario was found in the current implementation (the self-replace RPC is
   last-write-wins) — flagged only because the unified `readOnly` prop makes the question
   answerable for the first time (previously the two trees made it structurally impossible to view
   your own schedule without the edit affordances). If the answer is no, no change is needed
   beyond what section 2 already proposes.
