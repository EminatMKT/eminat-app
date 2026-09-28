import { z } from 'zod'

const ISO_DAY = /^(?!0000)\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/
const MINUTE_CLOCK = /^(?:[01]\d|2[0-3]):[0-5]\d$/

function existsInCalendar(value: string): boolean {
  const [year, month, day] = value.split('-').map(Number)
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate()
}

const isoDate = z.string().regex(ISO_DAY).refine(existsInCalendar)
const minuteTime = z.string().regex(MINUTE_CLOCK)

const billingTemporalSchemas = { isoDate, minuteTime }

/** The date-only and wall-clock fields of a billing record: a real calendar day and a time
 * carried to the minute. */
export default billingTemporalSchemas

// Dates are text, never Date objects, so nothing here can shift a day by applying a timezone.
// The pattern settles the format, the year floor of 0001 and the month and day ranges; the
// refinement settles the only thing a pattern cannot, which is how long each month actually
// is — so 2024-02-29 stands and 2025-02-29 and 2026-04-31 do not. Date.UTC is used purely as
// a calendar table (day 0 of the next month is the last day of this one); its two-digit-year
// remapping lands on a year with the same leap rule, so it cannot change the answer. A month
// note is dated like anything else: it may fall on any day, and the calendar groups it by month.
// Time has no seconds at all: minute granularity is the constraint, and 24:00 — a value
// Postgres accepts as a time — is outside the clock and is refused here too.
