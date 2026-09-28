import { addMonths, parseISO, startOfMonth } from 'date-fns'
import { localDate } from '@/shared/utils/dates'

/** The month `step` months away from `month`, as the ISO first day of that month. */
export default function shiftMonth(month: string, step: number): string {
  return localDate(startOfMonth(addMonths(parseISO(month), step)))
}

// What the two arrows of the calendar answer. It is one line, and it is its own unit because of
// the case the one line hides: `addMonths` keeps the day of the month, so stepping from a 31st
// overflows into the month after next unless the result is pulled back to the first.
