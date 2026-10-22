# Tasks Weekly Availability — UI Reference Brief

> Mobbin MCP was unavailable in this session (no Pro plan, and the Claude in Chrome extension
> did not connect after three attempts). Per explicit direction from the project owner, this
> brief substitutes public WebSearch results for Mobbin captures. None of the links below are
> Mobbin URLs; each entry names its real source instead.

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

### Zencal — recurring availability settings

- URL: https://zencal.io/help/recurring-availability
- Platform and captured state: scheduling SaaS, help-center walkthrough.
- Visible pattern: multiple independent time slots per day (e.g. 9:00–12:00 and 14:00–17:00)
  added with a simple "+" control, each slot edited independently.
- Why it helps: confirms the multi-range-per-day model is an established pattern in real
  scheduling products, not a novel UI shape to invent from scratch.
- What to adopt conceptually: one lightweight "add range" affordance per day, no modal.
- What to reject or avoid: Zencal frames slots as bookable windows for others; this plan's
  ranges are self-declared availability only — no booking semantics should leak into copy.
- Accessibility concern to verify independently: each added slot's start/end inputs need
  their own label pair, not a shared label for the whole day.

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
  (21st.dev, Zencal, Bayzat).
- A visible, explicit "add another range" action per day, not an edge-case-only path (Bayzat).
- A short textual declared-vs-expected comparison placed next to the schedule, not a chart
  (Toggl Plan).
- An explicit caveat sentence when the data shown is partial, approximate, or could be
  misread (Vodafone).

## Patterns explicitly rejected

- Redundant per-day on/off toggle when an empty range list already means unavailable
  (21st.dev).
- Hard caps on ranges per day and leave/day-off gating — no such concepts exist in Delivery 1
  (Bayzat).
- Booking/reservation framing for ranges — these are self-declared, not bookable slots
  (Zencal).
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
