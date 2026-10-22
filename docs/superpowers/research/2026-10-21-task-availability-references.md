# Tasks Weekly Availability — UI Reference Brief

> Mobbin MCP itself was never available in this session (no Pro plan). The first pass used
> WebSearch as a substitute. Once the Claude in Chrome extension connected, Mobbin was browsed
> directly as a logged-in site instead of through its MCP tools, and one direct Mobbin capture
> was added below. A short shadcn/ui component check was added at the end per the same
> follow-up request.

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

## Patterns worth adapting

- Day-row holds an independent list of ranges, each with its own add/remove control
  (21st.dev, Workable, Bayzat).
- A visible, explicit "add another range" action per day, not an edge-case-only path
  (Workable, Bayzat).
- A per-day declared-hours total rendered directly under that day's ranges (Workable) — this
  plan computes it with `declaredHoursByDay`/`compareDailyHours` rather than storing it.
- A short textual declared-vs-expected comparison placed next to the schedule, not a chart
  (Toggl Plan).
- An explicit caveat sentence when the data shown is partial, approximate, or could be
  misread (Vodafone).

## Patterns explicitly rejected

- Redundant per-day on/off toggle when an empty range list already means unavailable
  (21st.dev, Workable's weekday chip row that collapses unselected days).
- Hard caps on ranges per day and leave/day-off gating — no such concepts exist in Delivery 1
  (Bayzat).
- "Copy to all days" shortcuts and work-break modeling — out of Delivery 1 scope (Workable).
- Booking/reservation framing for ranges — these are self-declared, not bookable slots.
- Color-only status signaling for the daily comparison — status must be legible as text
  (Toggl Plan).
- Time-zone grouping or conversion in the team view — single time zone assumed (Vodafone).

## Resulting implementation guidance

- `WeeklyAvailabilityEditor`: one row per ISO weekday, each holding zero-to-many ranges; each
  range is an independent start/end/note group with its own "Remove {Day} range {n}" control;
  an "Add {Day} range" button is always visible per day, with no on/off toggle and no cap.
- `MemberAvailabilityCard`: for each non-empty day, render the ordered ranges and notes, then
  a short text comparison (`compareDailyHours`) carrying its status as text, never color alone;
  for a missing schedule or missing/inactive jornada, render the explicit caveat sentence
  required by the spec instead of a fabricated number.
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
