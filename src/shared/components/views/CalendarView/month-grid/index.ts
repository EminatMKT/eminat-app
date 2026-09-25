import { eachDayOfInterval, endOfMonth, endOfWeek, parseISO, startOfWeek } from 'date-fns'
import { localDate } from '@/shared/utils/dates'

/** Every day of the calendar page for `month`, as ISO date-only strings, in whole weeks. */
export default function buildMonthGrid(month: string): readonly string[] {
  const first = parseISO(month)
  const page = { start: startOfWeek(first), end: endOfWeek(endOfMonth(first)) }
  return eachDayOfInterval(page).map((day) => localDate(day))
}

// The grid maths of the calendar, alone and without React, because this is the half that can be
// wrong: a page that starts on the wrong weekday or drops the 29th of a leap February is a bug
// nobody sees in a screenshot of the right month.
//
// `parseISO` and `localDate` are both here on purpose. `new Date('2026-09-01')` reads the string
// as UTC and lands on August 31st in a negative offset; `toISOString()` makes the same mistake on
// the way out. The pair keeps the whole calculation in the calendar of whoever is looking.
//
// Weeks run Sunday to Saturday. The `locale` the view receives formats names and numbers, and
// changing where the week starts is a different decision — one the feature has not asked for yet.
