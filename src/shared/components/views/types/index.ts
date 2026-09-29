/** A record the calendar places on a day. `date` is an ISO date-only string (`YYYY-MM-DD`);
 *  `label` is the one line its chip draws, cut with an ellipsis when it does not fit, and
 *  `accessibleLabel` is the whole of it, said out loud and shown on hover. */
export type CalendarItem = {
  id: string; date: string; label: string; accessibleLabel: string
  /** `done`: a settled item, drawn apart from the open ones with a check mark and a quiet chip. */
  tone?: 'done'
}

/** How much time one page of the calendar covers. Only the month is drawn today. */
export type CalendarMode = 'month'

/** A controlled calendar: `period` is the first day of the range on screen, same ISO shape, and
 *  `mode` says how long that range is. Grouping, filtering and authorization stay outside —
 *  the view places what it receives. */
export type CalendarViewProps<T extends CalendarItem> = {
  period: string
  mode: CalendarMode
  items: readonly T[]
  locale: string
  /** Today, as the feature counts days (same ISO shape): its cell is marked. */
  today?: string
  /** What the jump-to-today control says. Given together with `today`, the header offers it —
   *  hidden while `period` already is today's — landing on the period `today` falls in. */
  todayLabel?: string
  onPeriodChange: (period: string) => void
  onDaySelect: (date: string) => void
  onItemSelect: (id: string) => void
  /** What the control that reveals a full day's hidden entries says, given how many it hides. */
  moreLabel: (hidden: number) => string
  /** What the same control says once the day is open, to fold it back. */
  lessLabel: string
}

// The contracts the shared views speak. They name no feature: a payment, an appointment and a
// note all reach the calendar as a `CalendarItem`, and everything the view cannot decide on its
// own — what an entry says, what a full day's overflow is called, what a click means — comes in
// from the feature.
//
// An entry is a string and not a render callback because the view has to cut it to one line and
// repeat it whole on hover: a `title` attribute takes text, not a tree. The range is `period` +
// `mode` rather than `month` so a week or a day page can arrive later without the feature's
// props changing shape; the mode picks the grid and how far one step of the arrows goes.
