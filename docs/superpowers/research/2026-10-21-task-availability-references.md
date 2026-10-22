# Tasks Weekly Availability — UI Reference Brief

> Mobbin MCP itself was never available in this session (no Pro plan). The first pass used
> WebSearch as a substitute. Once the Claude in Chrome extension connected, Mobbin was browsed
> directly as a logged-in site (free tier — text-in-screenshot search only, AI semantic search
> blocked behind "Upgrade for full access") instead of through its MCP tools, and one direct
> Mobbin capture was added. A short shadcn/ui component check was added per the same follow-up
> request. A third pass ran an adversarial review of the plan's still-undecided UI questions
> (layout, not behavior) and delegated two subagents — one for the self-editor, one for the
> read views — to browse Mobbin/shadcn/WebSearch for each question; their findings are folded
> into the sections below and marked where no sourced capture exists.

## Delivery 1 constraints

- seven-day recurring editor;
- multiple ranges per day;
- optional note per range;
- daily jornada comparison;
- weekly declared total only;
- self-edit only;
- teammate/admin read-only cards;
- no live state, task overlays, approvals, exceptions, or balances.

## Search queries

1. `weekly recurring availability editor UI employee scheduling app multiple time ranges per day`
2. `split shift weekly schedule editor interface design multiple ranges same day`
3. `team availability view coworkers working hours read-only card UI design pattern`

## Selected references

### 21st.dev — "Weekly Availability Editor" (open-source shadcn component)

- URL: https://21st.dev/@coss.com/components/p-switch-9.md
- Platform and captured state: web component gallery, source-level description (not a live
  product screenshot).
- Visible pattern: one row per weekday with an on/off toggle, a list of From/To range fields
  underneath, per-row add/remove, and a "copy to other days" action.
- Why it helps: closest structural match to the seven-day self-editor this plan needs —
  day-by-day rows holding zero-to-many ranges.
- What to adopt conceptually: day-row-holds-range-list layout; add/remove per range.
- What to reject or avoid: the on/off day toggle (redundant — an empty range list already
  means "no availability that day" in this plan) and the copy-to-other-days shortcut (not in
  Delivery 1 scope).
- Accessibility concern to verify independently: toggle and per-range controls need distinct
  accessible names per day (e.g. "Remove Monday range 2"), not just icon buttons.

### Workable — "Create a work schedule" (direct Mobbin capture)

- Mobbin URL: https://mobbin.com/screens/52f47ca0-63ad-4252-81da-1701bd0fa6ea
- Platform and captured state: Workable (HR/ATS product), desktop web, "Creating a work
  schedule" flow, captured live via Mobbin.
- Visible pattern: a weekday chip row (Mo–Su) at the top, then one expandable section per
  day; each expanded day shows a "Working hours" row with start/end fields, an "Add new" link
  to append a second range on the same day, a "Copy to all" shortcut, an optional work-breaks
  toggle, and a per-day "Total working hours: 08:00" footer line.
- Why it helps: it is the closest direct structural match found for the whole Delivery 1
  editor — per-day range list with its own add control and a per-day declared-hours total —
  confirming the plan's shape against a shipped product rather than an open-source component
  alone.
- What to adopt conceptually: the per-day "Add new" range link; the per-day declared-hours
  total line directly under that day's ranges (this plan computes it from
  `declaredHoursByDay`, not a stored field).
- What to reject or avoid: the top weekday chip row that hides/collapses a day's ranges
  (Delivery 1 always shows all seven days so an empty day is visibly "no ranges," not
  collapsed away) and the "Copy to all" shortcut and work-breaks toggle (out of Delivery 1
  scope).
- Accessibility concern to verify independently: in Workable's capture, "Add new" and "Total
  working hours" read ambiguously outside their day's heading context; this plan's accessible
  names must name the day explicitly (e.g. "Add Monday range"), as the plan already specifies.

### Bayzat — split-shift scheduling

- URL: https://help.bayzat.com/en/articles/12469109-how-to-schedule-split-shifts-for-employees
- Platform and captured state: HR/workforce product, help article with product screenshots.
- Visible pattern: clicking a day cell that already holds a range opens a second range on the
  same day; the product then enforces a hard cap of two segments and blocks a second segment
  on a day off or leave.
- Why it helps: it is the clearest real-world precedent for "multiple ranges on the same day,"
  and it shows a concrete way products limit the feature in practice.
- What to adopt conceptually: treat "add another range on this day" as a first-class, visible
  action per day, not a buried edge case.
- What to reject or avoid: the hard two-segment cap and the day-off block — Delivery 1 places
  no cap on ranges per day and has no leave/day-off concept to gate against.
- Accessibility concern to verify independently: a cell-click-to-add interaction must have an
  equivalent keyboard/button path; this plan already uses an explicit "Add Monday range"
  button, which avoids the ambiguous click-target problem Bayzat's pattern implies.

### Toggl Plan — Availability Overview

- URL: https://support.plan.toggl.com/article/193-availability-overview
- Platform and captured state: resource-planning SaaS, help-center article.
- Visible pattern: a summary bar per person showing booked percentage and remaining available
  hours, with over-booking flagged in a distinct visual treatment.
- Why it helps: it is a real precedent for surfacing a declared-vs-expected comparison as a
  short, scannable summary next to a schedule — directly analogous to this plan's
  declared-hours-vs-`jornada.horas_dia` comparison.
- What to adopt conceptually: pair the schedule with a short textual comparison, not a chart.
- What to reject or avoid: Toggl's over-booking treatment reportedly relies on color (red) as
  a primary signal; this plan's own accessibility rule requires text/icon status, not color
  alone, so the summary text must carry the status explicitly.
- Accessibility concern to verify independently: status must be readable from text alone
  (`below`/`complete`/`above`/`unavailable`), verified independently of any badge color.

### Vodafone IoT — "Mi Equipo" (My Team) screen

- URL: https://support.officespaces.iot.vodafone.com/hc/es/articles/7076981794845-Mi-Equipo
- Platform and captured state: workplace-management product, help-center article (Spanish).
- Visible pattern: a team list showing each colleague's location and working hours for the
  selected day, grouped by location or time zone, with an explicit caveat that displayed hours
  are not converted to the viewer's time zone.
- Why it helps: it is a real example of a read-only teammate view that states its own
  limitation plainly instead of implying false precision — directly relevant to this plan's
  explicit missing-schedule / missing-jornada states.
- What to adopt conceptually: an explicit, visible caveat sentence when data is partial or
  could be misread (mirrors this plan's required "jornada missing/inactive" and "schedule not
  configured" states).
- What to reject or avoid: time-zone grouping and conversion — out of scope; this plan assumes
  a single operating time zone.
- Accessibility concern to verify independently: the caveat text must be part of the normal
  reading order for assistive tech, not a tooltip-only aside.

### Mercor — "Availability" (job-application onboarding step)

- Mobbin URL: https://mobbin.com/screens/f3c03726-3837-4e13-b396-a0215530c91e
- Platform and captured state: Mercor (hiring/staffing platform), desktop web, "Availability"
  step inside a multi-step job-application flow, captured live via Mobbin (text-in-screenshot
  "weekly availability"; independently resurfaced by a second search for "availability" too).
- Visible pattern: one row per weekday (colored day-initial badge), each row with its own
  start/end time dropdowns, an inline "×" remove control, and an inline "+" add-another-range
  control per row; a separate "Unavailable" toggle sits above the list; Sunday shows as
  "Unavailable" by default with its own "+".
- Why it helps: a fourth independent shipped example (after 21st.dev, Workable, Bayzat) of
  "each range is its own row with its own delete control" — strong convergent evidence for
  that shape specifically, and the clearest reference for how the add/remove controls sit
  directly on the range row.
- What to adopt conceptually: compact start–end row with inline remove; a visible per-day
  "add" affordance.
- What to reject or avoid: the per-row "+" icon (ambiguous accessible name — unclear whether
  it adds at the end or beside that row) in favor of one explicit "Add {Day} range" button at
  the end of that day's range list; the separate day-level "Unavailable" toggle (same
  rejection already recorded for 21st.dev/Workable — an empty range list already means
  unavailable).
- Accessibility concern to verify independently: Mercor's × and + controls carry no visible
  text in the capture; this plan's own required accessible names ("Remove {Day} range {n}",
  "Add {Day} range") already avoid that ambiguity.

### Behance — "Edit Availability" popover (rejected pattern)

- Mobbin URL: https://mobbin.com/screens/11a72192-5542-4538-80f8-490a2e25c862
- Platform and captured state: Behance, desktop web, "Editing availability" flow, captured
  live via Mobbin (text-in-screenshot "edit availability").
- Visible pattern: an "Edit Availability" button on the profile card opens a floating
  popover/modal anchored near the trigger, with its own title, controls, and "Done"/"Cancel"
  footer buttons, closed via a top-right X.
- Why it helps: the clearest real counter-example for "separate overlay as the edit entry
  point" — confirms the pattern ships in production, which is exactly why it needs to be
  rejected explicitly rather than ignored.
- What to adopt conceptually: nothing — used only as the reject case.
- What to reject or avoid: a popover/modal as the Delivery 1 edit entry point. The plan's own
  File Responsibility Map lists no Dialog/modal component, and Workable (already in this
  brief) already demonstrates the in-place alternative; introducing overlay infrastructure
  here would be unplanned scope.
- Accessibility concern to verify independently: not applicable — this pattern is rejected,
  so its focus-trap/focus-return requirements are exactly the complexity Delivery 1 avoids by
  going in-place.

### Linktree — "Weekly availability" wizard step (rejected pattern)

- Mobbin URL: found via the same Mercor search session (Web, "weekly availability",
  text-in-screenshot), captured live via Mobbin.
- Platform and captured state: Linktree, desktop web, "Availability — Step 2 of 4" modal
  wizard for booking setup.
- Visible pattern: a circular day-chip selector (S M T W T F S, active days highlighted) above
  a single start/end range with dropdown pickers and one "–" remove icon; the chosen range
  applies to every selected day chip at once.
- Why it helps: reinforces two rejections already in this brief from one more independent
  product — a separate multi-step modal as the edit entry point, and a day-chip selector that
  applies one range across several days at once.
- What to adopt conceptually: nothing new — confirms decisions already made.
- What to reject or avoid: the day-chip multi-select-then-apply-one-range pattern (already
  rejected via 21st.dev/Workable for a different reason — redundant day toggle; here rejected
  again because it couples days instead of keeping each day's ranges independent); the
  multi-step wizard modal as an edit entry point.
- Accessibility concern to verify independently: if a day-chip selector were ever adopted
  later, each chip needs its own day name as an accessible name, not just the visible letter —
  not relevant to Delivery 1 since the pattern is rejected.

### Intercom — persistent character counter

- Mobbin URL: https://mobbin.com/screens/7859136a-9284-475c-894f-76e98fa8a876
- Platform and captured state: Intercom, desktop web, "Editing profile" flow, captured live
  via Mobbin (text-in-screenshot "characters remaining"). Zillow's message composer shows the
  same pattern ("256 characters remaining" under a textarea), confirming it is not an
  isolated choice.
- Visible pattern: small gray text under a short text field reading "160 characters
  remaining", visible at all times — before any save attempt or error, not only on focus.
- Why it helps: direct evidence that a character counter should be proactive, not reactive to
  an error — matches this repo's own heuristic rules ("an error that can be prevented is not
  reported: it is prevented" and "what is not self-explanatory carries its help right beside
  it").
- What to adopt conceptually: render "{280 - length} characters remaining" (or its i18n key)
  under the note input at all times, updating live as the user types, with `maxLength={280}`
  on the input itself.
- What to reject or avoid: showing the counter only on focus or only after a failed save.
- Accessibility concern to verify independently: the counter must be wired to the input via
  `aria-describedby`, not just placed visually nearby, so a screen reader announces it while
  typing, not only a sighted scan.

### Hilti CrewCenter — above/below deviation arrows (WebSearch, not Mobbin)

- URL: https://help.crewcenter.hilti.com/hc/en-us/articles/30407392106641 (direct fetch
  returned 403; this entry is based on the WebSearch result summary, not a full page read —
  flagged here as such, not a verified capture).
- Platform and captured state: CrewCenter by Hilti (workforce-management product), help-center
  article text, no screenshot of our own.
- Visible pattern (per the search summary): an up arrow (↑) when worked/rest time is above
  expected, a down arrow (↓) when it is below expected.
- Why it helps: the only reference found with a concrete non-color symbol for a
  declared-vs-expected time comparison — directly applicable to `compareDailyHours`'s four
  statuses.
- What to adopt conceptually: ↓ for `below`, ↑ for `above`, extended here (not sourced from
  Hilti) with ✓ for `complete` and a neutral dash/en-dash glyph for `unavailable` (no jornada
  reference), completing the plan's four states.
- What to reject or avoid: nothing to reject — a narrow icon convention, not a full
  composition to evaluate.
- Accessibility concern to verify independently: could not verify whether Hilti pairs the
  arrow with visible text; this plan already requires text alongside the symbol regardless, so
  this reference should not be relied on for that point.

### shadcn.io / shadcnstudio — Skeleton Card Grid block (third-party, not ui.shadcn.com)

- URL: https://www.shadcn.io/blocks/skeleton-card-grid
- Platform and captured state: third-party shadcn-styled block gallery (explicitly not
  `ui.shadcn.com`, which this brief already confirmed has no dedicated skeleton/grid block),
  source-level description.
- Visible pattern: a responsive grid of placeholder cards (1 column on mobile, multi-column on
  desktop), each skeleton card matching the real card's footprint (same padding, same line
  count), pulse animation, swapped 1:1 for real content once loaded.
- Why it helps: gives a concrete shape for satisfying this repo's own Centinela detector
  `loading-placeholder-preserves-layout.ts`, which blocks `isLoading ? <Spinner>` on a
  Card/Table/Grid/List surface unless a Skeleton/min-height/reserved-layout marker exists —
  the loading state for `SolicitudesAvailabilityView` needs a true skeleton, not a spinner
  swap.
- What to adopt conceptually: skeleton card dimensions mirror the real `MemberAvailabilityCard`
  footprint; the same grid container is reused for loading and loaded states.
- What to reject or avoid: nothing structural — just don't adopt a shimmer library dependency
  for this; the project's own CSS Modules pulse is enough.
- Accessibility concern to verify independently: mark skeleton cards `aria-hidden="true"` so
  screen readers don't announce empty placeholder cards as content.

### Deputy — "By Area" / "By Team Member" schedule view toggle (rejected pattern)

- URL: https://help.deputy.com (Schedule tab documentation; summarized via WebSearch, not
  independently browsed this session).
- Platform and captured state: Deputy (workforce-scheduling product), help-center description
  of its Schedule tab.
- Visible pattern: a view selector switches the same weekly schedule between grouped-by-area
  and grouped-by-team-member layouts; a separate personal "Me" tab shows only the logged-in
  user's own week.
- Why it helps: the real precedent for the heavier alternative to this plan's admin read-all
  view — a grouping toggle — useful specifically to justify rejecting it for Delivery 1.
- What to adopt conceptually: nothing directly; confirms that a flat list plus a per-card team
  metadata line is the deliberately smaller surface already chosen.
- What to reject or avoid: the grouping-view toggle itself, and the separate "Me" tab pattern —
  out of Delivery 1 scope; one unified card list already serves both the viewer's own card and
  teammates' cards.
- Accessibility concern to verify independently: not applicable — rejected pattern, nothing to
  audit.

## Patterns worth adapting

- Day-row holds an independent list of ranges, each with its own add/remove control
  (21st.dev, Workable, Bayzat, Mercor).
- A visible, explicit "add another range" action per day, not an edge-case-only path
  (Workable, Bayzat).
- A per-day declared-hours total rendered directly under that day's ranges (Workable) — this
  plan computes it with `declaredHoursByDay`/`compareDailyHours` rather than storing it.
- A short textual declared-vs-expected comparison placed next to the schedule, not a chart
  (Toggl Plan).
- An explicit caveat sentence when the data shown is partial, approximate, or could be
  misread (Vodafone).

- A per-range row with its own inline remove control, reinforced by a fourth independent
  shipped example (Mercor) beyond 21st.dev/Workable/Bayzat.
- A persistent, proactive character counter under a length-limited field, updating live
  (Intercom, Zillow).
- Non-color status symbols for the daily comparison — ↓/✓/↑/– — always paired with text
  (Hilti CrewCenter, extended here for `complete`/`unavailable`).
- A short summary line placed near a card's identity header, not in a footer (the project's
  own pre-Task-4 synthetic `MemberAvailabilityCard` already does this via `s.capHead`; Toggl
  Plan independently confirms summary-near-top over summary-at-bottom).
- A responsive card grid that collapses to one column on narrow screens without fixed
  column-count breakpoints — the project's own `SolicitudesAvailabilityView` already renders
  `<div className={s.grid}>`; Task 4 widens that CSS rather than inventing a new layout.
- A true layout-preserving skeleton for the loading state, not a spinner swap (shadcn.io
  Skeleton Card Grid block; required here by this repo's own
  `loading-placeholder-preserves-layout.ts` Centinela detector).

## Patterns explicitly rejected

- Redundant per-day on/off toggle when an empty range list already means unavailable
  (21st.dev, Workable's weekday chip row, Mercor's day "Unavailable" toggle).
- Hard caps on ranges per day and leave/day-off gating — no such concepts exist in Delivery 1
  (Bayzat).
- "Copy to all days" shortcuts and work-break modeling — out of Delivery 1 scope (Workable).
- Booking/reservation framing for ranges — these are self-declared, not bookable slots.
- Color-only status signaling for the daily comparison — status must be legible as text
  (Toggl Plan).
- Time-zone grouping or conversion in the team view — single time zone assumed (Vodafone).
- A separate modal/popover as the edit entry point (Behance), and a multi-step wizard modal
  for the same purpose (Linktree) — the plan lists no Dialog component; edit in place instead.
- A day-chip selector that applies one range across several days at once (Linktree) — couples
  days that Delivery 1 keeps independent.
- A per-row icon-only "+" add control (Mercor) — ambiguous accessible name; use one explicit
  "Add {Day} range" button at the end of that day's list instead.
- A schedule-grouping view toggle or a separate "Me" tab for the admin read-all view (Deputy)
  — unnecessary extra surface; a flat list with a per-card team metadata line already answers
  "whose schedule, from what team" without grouping UI.

## Resolved UI ambiguities (adversarial review pass)

An adversarial review of the plan's Task 4/5/6 found 13 UI questions the plan specifies
behavior for but not layout. Two subagents investigated them via live Mobbin browsing (free
tier — text-in-screenshot search only), shadcn/ui, and WebSearch backup. Answers not backed by
a sourced capture are labeled "general convention" rather than implied as verified.

**WeeklyAvailabilityEditor (self-editor)**

1. **Edit entry point:** transform the existing card in place; do not open a modal/popover.
   The plan's File Responsibility Map lists no Dialog component. *Rejects: Behance, Linktree.*
2. **Range row layout on narrow screens:** line 1 = start + end time (wrap to a column if
   44px targets don't fit side by side), line 2 = optional note, "Remove" as a full-width
   labeled row (not icon-only) to meet the 44×44 touch target — each input keeps its day-named
   accessible label regardless of visual stacking. *Source: Mercor, this plan's own
   accessibility requirements.*
3. **Status symbol:** ↓ `below`, ✓ `complete`, ↑ `above`, – `unavailable`; always paired with
   text, never the symbol alone. *Source: Hilti CrewCenter (↓/↑ only — ✓/– extended here).*
4. **"Add range" button placement:** at the end of that day's range list (after the last range,
   or after the empty state if none), never a per-row icon. *Source: Workable, rejecting
   Mercor's per-row "+".*
5. **Note hierarchy:** same semantic list item as its range, stacked immediately under
   start/end — no accordion/disclosure, so it's never hidden behind extra interaction.
   *Source: the plan's own Task 4 Step 2 requirement; no direct capture found.*
6. **Character counter:** "{280 − length} characters remaining" under the note input at all
   times, live-updating, wired via `aria-describedby`. *Source: Intercom, Zillow.*

**Read views (MemberAvailabilityCard / SolicitudesAvailabilityView)**

7. **Multiple ranges in one day:** each range is its own `<li>` with its time and note on the
   same line — never chips, never comma-joined text. *Source: Mercor; matches the plan's own
   Task 4 Step 2 test requirement.*
8. **Weekly total placement:** one summary line directly under the card's identity header
   (name/team), above the seven day rows — not a footer. *Source: the project's own pre-Task-4
   synthetic card (`s.capHead` position), Toggl Plan.*
9. **Team grid layout:** responsive grid, `auto-fill, minmax(340px, 1fr)`-style, collapsing to
   one column on narrow screens — no fixed column-count breakpoints. *Source: the project's own
   `SolicitudesAvailabilityView` already renders this grid container; widen its CSS.*
10. **Own card vs teammates':** a "(You)" text suffix on the card's own name/heading, plus the
    project's existing accent-border token on that one card — text, not color alone. *General
    convention (Slack/Linear/Asana), not a sourced Mobbin capture this session.*
11. **Empty day vs no schedule at all:** an empty day renders its heading with no range list and
    no text (silence = no ranges that day, matching "no warning for an empty day"); a fully
    missing schedule replaces the entire seven-day block with one explicit sentence (e.g.
    "Schedule not configured"). *Source: mirrors Vodafone's explicit-caveat-sentence pattern
    already in this brief.*
12. **Loading/error/empty states:** loading = skeleton cards reserving the real grid cell size
    (never a bare spinner replacing the grid); error = keep the header, show an inline message
    plus retry in the same container; empty member list = one sentence inside the same grid
    container. *Source: shadcn.io Skeleton Card Grid block; required by this repo's own
    `loading-placeholder-preserves-layout.ts` Centinela detector.*
13. **Admin grouping:** keep the flat, alphabetically-ordered query (`get_visible_weekly_availability`
    already orders this way, no `GROUP BY`); show the team name as a small metadata line inside
    each card, never as a section heading or grouping toggle. *Source: rejects Deputy's
    By-Area/By-Team view toggle as unnecessary extra surface.*

## Resulting implementation guidance

- `WeeklyAvailabilityEditor`: one row per ISO weekday, each holding zero-to-many ranges; each
  range is an independent start/end/note group with its own "Remove {Day} range {n}" control;
  an "Add {Day} range" button is always visible per day, with no on/off toggle and no cap.
  Editing happens in place (no modal); the note field shows a live "characters remaining"
  counter wired via `aria-describedby`.
- `MemberAvailabilityCard`: a summary line (weekly declared total) sits under the card's
  identity header, not a footer. For each non-empty day, render the ordered ranges and notes
  as independent list items (never chips/comma-joined), then a short text comparison
  (`compareDailyHours`) using the ↓/✓/↑/– symbols paired with text, never color alone; for a
  missing schedule or missing/inactive jornada, render the explicit caveat sentence required by
  the spec instead of a fabricated number. The viewer's own card carries a "(You)" text suffix
  plus the existing accent-border token; team name renders as a metadata line, never a group
  heading.
- `SolicitudesAvailabilityView`: widen the existing `s.grid` container's CSS for the taller
  truthful cards rather than introducing a new layout; its loading state uses skeleton cards
  matching the real card footprint (required by the repo's own loading-placeholder detector),
  its error state keeps the header and shows an inline retry, and an empty member list renders
  one sentence inside the same grid container.
- Weekly declared hours stay informational text beside the per-day rows — no weekly summary
  bar, no percentage, no derived weekly target, matching the Scope Guard.

## shadcn/ui component check

Searched `ui.shadcn.com` directly (Components, Blocks, and the in-site docs search) for a
ready-made scheduling/availability block.

- No dedicated weekly-availability, scheduling, or roster block exists in shadcn/ui's own
  Blocks library (checked the Featured/Sidebar/Login/Signup block categories) or docs search
  (`availability` and `schedule` both return unrelated registry-infrastructure docs, not
  component results).
- Confirms this plan's own approach is correct: Task 5 composes the editor from native
  `<input type="time">` and `<input type="text">` elements plus the project's existing shared
  UI, not from a shadcn block — there is no block to reach for instead.
- `Toggle Group` (`ui.shadcn.com/docs/components/toggle-group`) is the closest primitive to
  Workable's weekday chip row, confirming that pattern is easy to build if ever wanted — but
  it is already rejected above, so it is not needed for Delivery 1.
- The 21st.dev "Weekly Availability Editor" referenced above is a third-party, shadcn-based
  community component (not part of shadcn/ui's own registry) and requires a 21st.dev API key
  to install; it was used here only as a structural reference, not as a dependency to add.
- The same applies to the shadcn.io/shadcnstudio Skeleton Card Grid block referenced above:
  it is a third-party shadcn-styled gallery, not `ui.shadcn.com` — used only to shape the
  loading skeleton, not as a package to install.
