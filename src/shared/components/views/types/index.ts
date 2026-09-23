import type { ReactNode } from 'react'

/** A record the calendar places on a day. `date` is an ISO date-only string (`YYYY-MM-DD`). */
export type CalendarItem = { id: string; date: string; accessibleLabel: string }

/** A controlled month view: `month` is the first day of the month on screen, same ISO shape.
 *  Grouping, filtering and authorization stay outside — the view places what it receives. */
export type CalendarViewProps<T extends CalendarItem> = {
  month: string
  items: readonly T[]
  locale: string
  renderItem: (item: T) => ReactNode
  onMonthChange: (month: string) => void
  onDaySelect: (date: string) => void
  onItemSelect: (id: string) => void
  emptyDayLabel: (date: string) => string
}

// The contracts the shared views speak. They name no feature: a payment, an appointment and a
// note all reach the calendar as a `CalendarItem`, and everything the view cannot decide on its
// own — what a record looks like, what an empty day says, what a click means — is a callback.
//
// The generic on `CalendarViewProps` is what keeps `renderItem` typed at the call site: the
// feature passes its own row type, gets it back in the callback, and the view never learns it.
