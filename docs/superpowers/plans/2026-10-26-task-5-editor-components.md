# Task 5 Weekly Availability Editor — Component Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Implement one bounded task at a time and run its focused checks before moving on.

**Goal:** Build a seven-day self-service availability editor that stays small, accessible, testable, and compatible with the existing Task 5 test contract.

**Architecture:** Keep domain calculations in the existing availability utilities. Keep editor state transitions and DTO preparation in pure tested helpers. Render repeated UI through boxed child components; `index.tsx` only owns the form lifecycle and composes those children.

**Tech Stack:** React, TypeScript, Vitest, existing `Button`, existing i18n `useT`, native `time`/`text` inputs, CSS Modules, `saveOwnAvailability`.

---

## Non-negotiable constraints

- Do not modify the existing editor test, CSS outside this folder, the aggregate view, translations, TODO files, or commits during the editor slice.
- Every `.tsx` file declares one component and lives in that component's folder.
- Every exported component/type/helper has a named responsibility and default export where the repository convention requires it.
- No user-facing strings, domain literals, bracket-literal property access, inline object types, inline handlers with bodies, array-index React keys, or `style` attributes.
- Use the shared `Button`; native inputs are acceptable because no shared Input primitive exists in the UI barrel.
- Every button declares `type="button"` or `type="submit"`; removal confirms before mutating state.
- Save is blocked only by structural validation or an active request; daily hour mismatch is a warning, not a blocker.

## Component and helper map

### Existing files — keep responsibilities narrow

- `WeeklyAvailabilityEditor/constants.ts` — editor copy keys, field names, statuses, defaults, and layout tokens only.
- `WeeklyAvailabilityEditor/types.ts` — domain-facing props and named editor action/state types only.
- `WeeklyAvailabilityEditor/component-types.ts` — child-component prop types only.
- `WeeklyAvailabilityEditor/index.test.tsx` — existing static contract; do not edit.

### New pure modules

- `WeeklyAvailabilityEditor/editor-state/index.ts` — one boxed editor-state unit with a single named default facade and private operations for initialization, actions, and DTO preparation.
- `WeeklyAvailabilityEditor/editor-state/index.test.ts` — add/remove/change/DTO tests; no UI fixtures.
- `WeeklyAvailabilityEditor/editor-labels/index.ts` — day label and accessible-name builders using `useT` output and named copy tokens.
- `WeeklyAvailabilityEditor/editor-labels/index.test.ts` — label interpolation tests.

### New components

- `WeeklyAvailabilityEditor/RangeField/index.tsx` — one labeled input plus one linked error message; supports `time` and `text` through named props.
- `WeeklyAvailabilityEditor/AvailabilityRangeItem/index.tsx` — one repeated range: two time fields, note field, validation messages, and one confirmed remove action.
- `WeeklyAvailabilityEditor/AvailabilityRangeItem/types.ts` — `AvailabilityRangeItemProps` and field-error shape if not already in `component-types.ts`.
- `WeeklyAvailabilityEditor/DaySection/index.tsx` — one weekday region, its ranges, empty state, daily declared-hours comparison, and add-range action.
- `WeeklyAvailabilityEditor/DaySection/types.ts` — `DaySectionProps` only if the shared type file becomes too broad.
- `WeeklyAvailabilityEditor/EditorActions/index.tsx` — cancel/save controls and pending feedback; no form state.
- `WeeklyAvailabilityEditor/index.tsx` — form lifecycle, one editor state object, save request, and composition only.

## Task 1: Lock the pure state contract

**Files:**
- Create: `WeeklyAvailabilityEditor/editor-state/index.ts`
- Test: `WeeklyAvailabilityEditor/editor-state/index.test.ts`
- Modify only if required: `WeeklyAvailabilityEditor/types.ts`, `component-types.ts`

- [ ] Define one `EditableRange` shape with a stable `clientId` and the existing `WeeklyAvailabilityRange` fields.
- [ ] Implement the boxed `editor-state/index.ts` with one default-exported named facade. Keep initialization, action application, and DTO preparation as private named operations in the same file so the module has one public unit and its colocated test remains the contract.
- [ ] Test two ranges on one day, removing the second without changing the first, note isolation, and DTO omission of `id`/`clientId`.
- [ ] Run `pnpm test -- WeeklyAvailabilityEditor/editor-state/index.test.ts` and `pnpm typecheck`.

## Task 2: Build the smallest repeated field unit

**Files:**
- Create: `WeeklyAvailabilityEditor/RangeField/index.tsx`
- Create: `WeeklyAvailabilityEditor/RangeField/types.ts` if needed
- Create: `WeeklyAvailabilityEditor/RangeField/index.test.tsx`

- [ ] Render a visible `<label>` tied to a native input; do not use placeholder text as the accessible name.
- [ ] Render `aria-invalid` and `aria-describedby` only when an error exists.
- [ ] Render the error beside the field with `role="alert"` and copy supplied through props.
- [ ] Keep the component below the file-size limit and export only the component from its index.
- [ ] Test label association, invalid state, error linkage, `time` step, and note max length.
- [ ] Run the focused RangeField test.

## Task 3: Build one availability range item

**Files:**
- Create: `WeeklyAvailabilityEditor/AvailabilityRangeItem/index.tsx`
- Create: `WeeklyAvailabilityEditor/AvailabilityRangeItem/types.ts` if needed
- Create: `WeeklyAvailabilityEditor/AvailabilityRangeItem/index.test.tsx`

- [ ] Compose exactly three `RangeField` instances: start, end, and note.
- [ ] Use the stable `clientId` for the item key at the parent; never use the array index.
- [ ] Use `Button kind="delete"` or the repository's existing destructive Button kind with an explicit accessible label.
- [ ] Require confirmation before calling `onRemove`; the confirmation copy comes from the caller/constants, never an inline literal.
- [ ] Keep field error lookup outside JSX in named variables.
- [ ] Test independent changes, accessible remove label, explicit button type behavior, and confirmation cancel/confirm.
- [ ] Run the focused AvailabilityRangeItem test and `pnpm typecheck`.

## Task 4: Build one weekday section

**Files:**
- Create: `WeeklyAvailabilityEditor/DaySection/index.tsx`
- Create: `WeeklyAvailabilityEditor/DaySection/types.ts` if needed
- Create: `WeeklyAvailabilityEditor/DaySection/index.test.tsx`

- [ ] Render a semantic `<section>` with a heading and accessible day label.
- [ ] Render a truthful empty state when the day has no ranges.
- [ ] Map ranges to `AvailabilityRangeItem`; the map callback is a named function and its key is `clientId`.
- [ ] Render daily declared hours and comparison text from `declaredHoursByDay`/`compareDailyHours`.
- [ ] Keep below/above/unavailable states textual; color is supplementary only.
- [ ] Render one `Button kind="add"` with an accessible day-specific label and explicit type.
- [ ] Test empty day, two ranges, daily mismatch warning, complete day, and unavailable jornada.
- [ ] Run the focused DaySection test.

## Task 5: Compose the editor lifecycle

**Files:**
- Create: `WeeklyAvailabilityEditor/EditorActions/index.tsx`
- Create: `WeeklyAvailabilityEditor/EditorActions/index.test.tsx`
- Create: `WeeklyAvailabilityEditor/index.tsx`

- [ ] Use one typed editor state object; destructure it once after state reads.
- [ ] Keep action handlers as named functions outside JSX.
- [ ] Render seven stable day sections from the existing weekday constant.
- [ ] Render a visible weekly declared total and a non-blocking mismatch message.
- [ ] On submit, call `validateRanges`; if errors exist, keep focusable fields rendered and do not call `saveOwnAvailability`.
- [ ] While saving, disable submit through the shared Button's pending prop and expose pending text.
- [ ] Call `saveOwnAvailability(toSaveRanges(state))`; never pass a user ID.
- [ ] On success, call `onSaved(response)` and show success feedback before the parent exits edit mode.
- [ ] On failure, retain local edits and show recovery text in a live region.
- [ ] Cancel calls `onCancel` and never mutates persisted data.
- [ ] Test the existing static markup contract, save success, validation rejection, failed save recovery, cancel, and native labels.
- [ ] Run `pnpm test -- WeeklyAvailabilityEditor` and `pnpm typecheck`.

## Task 6: Queue and review the editor slice

- [ ] Run `pnpm test -- src/features/tasks/components/solicitudes/WeeklyAvailabilityEditor`.
- [ ] Run `pnpm typecheck` and `pnpm lint:css` only if CSS was added in this slice.
- [ ] Run `bun /home/wagner/.codex/plugins/cache/wsmithdr/centinela/2.53.1/.shared/pending-commits/main.ts check`.
- [ ] Queue each changed path with a reviewable message; do not commit or push.
- [ ] Review the diff for inline strings, index keys, missing button types, missing labels, and unconfirmed removal.

## Acceptance criteria

- Seven labeled days render even when all schedules are empty.
- Multiple ranges on one day remain independently editable.
- Overlap/reversed/invalid ranges block Save with field-linked errors.
- Touching ranges remain valid.
- Daily mismatch is visible but does not block Save.
- Save sends only ranges and replaces the parent with persisted response data.
- Save failure preserves the draft and explains recovery.
- Every control is keyboard reachable and has an accessible name.
- No file exceeds the repository's component/file-size rules.
