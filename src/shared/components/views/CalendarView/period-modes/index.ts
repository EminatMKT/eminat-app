import type { CalendarMode } from '@/shared/components/views/types'
import buildMonthGrid from '../month-grid'
import shiftMonth from '../shift-month'
import dateLabel from '../date-label'

type PeriodMode = {
  /** Every day the page for `period` shows, as ISO date-only strings, in the order drawn. */
  days: (period: string) => readonly string[]
  /** The period `by` steps away, as its ISO first day. */
  step: (period: string, by: number) => string
  /** What the header says about the period on screen. */
  name: (period: string, locale: string) => string
}

const PERIOD_MODES: Record<CalendarMode, PeriodMode> = {
  month: { days: buildMonthGrid, step: shiftMonth, name: (period, locale) => dateLabel(period, locale).month },
}

/** What each calendar mode means: which days its page shows, how far one step goes, its name. */
export default PERIOD_MODES

// The one place a calendar mode is turned into behaviour. The view and its header ask this table
// and never test the mode themselves, so adding a week or a day is one more row here —its grid,
// its step, its name— and nothing above it changes shape.
//
// Only the month exists. The row reuses the month's own units, which already carry the traps
// that matter: whole weeks around the month, and a step that lands on the 1st.
