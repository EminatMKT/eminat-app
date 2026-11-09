import type { Weekday } from '@/features/tasks/utils/availability/types'
import { ISO_WEEKDAY_BY_JS_DAY } from './constants'

/** The grid's ISO weekday (1 = Monday … 7 = Sunday) for a local date; JS counts Sunday as 0. */
export default function isoWeekday(date: Date): Weekday {
  const weekday = ISO_WEEKDAY_BY_JS_DAY[date.getDay()]

  return weekday
}

// The grid starts on Monday, JS on Sunday: this is the one place the two numberings meet.
