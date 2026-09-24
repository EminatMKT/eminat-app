import { addDays, parseISO } from 'date-fns'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import { localDate } from '@/shared/utils'
import { BUSINESS_TIME_ZONE, ISO_DAY, MIDNIGHT } from './constants'

/** Today on the business calendar, as an ISO date-only string. */
function today(now: Date = new Date()): string {
  return formatInTimeZone(now, BUSINESS_TIME_ZONE, ISO_DAY)
}

/** Milliseconds from `now` until the next business day begins. */
function msUntilNext(now: Date = new Date()): number {
  const tomorrow = localDate(addDays(parseISO(today(now)), 1))
  return fromZonedTime(`${tomorrow}${MIDNIGHT}`, BUSINESS_TIME_ZONE).getTime() - now.getTime()
}

const businessDay = { today, msUntilNext }
export default businessDay

// What "today" means for billing. Overdue and Upcoming split on it, so it cannot be the day of
// whoever happens to be looking: a laptop set to UTC would call a payment overdue five hours
// early. The contract fixes it to America/Guayaquil, and `formatInTimeZone` reads it there
// whatever the machine's own zone is.
//
// `msUntilNext` exists so the screen can wake up once, when the day turns, instead of ticking
// every second to notice. `parseISO` + `localDate` step the day as a calendar date and never as
// 24 hours of milliseconds, which is the arithmetic a daylight-saving change breaks.
