import { parseISO, startOfMonth } from 'date-fns'
import { localDate } from '@/shared/utils/dates'

/** The month `date` falls in, as its ISO first day. */
export default function periodOfMonth(date: string): string {
  return localDate(startOfMonth(parseISO(date)))
}

// Split from `period-modes` for the same reason `shift-month` and `month-grid` are: the maths
// that can be wrong lives alone, without React, so a wrong month is caught here and not in a
// screenshot.
