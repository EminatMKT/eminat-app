import { MINUTES_PER_HOUR, TIME_PATTERN, TIME_SEPARATOR } from '../constants'

/** Minutes since midnight for a canonical `HH:mm` value, or `null` when it doesn't parse. Shared
 *  by `durationHours` and `validateRanges` so both agree on what counts as a valid time. */
function minutesOf(value: string): number | null {
  if (!TIME_PATTERN.test(value)) return null

  const [hours, mins] = value.split(TIME_SEPARATOR).map(Number)

  return hours * MINUTES_PER_HOUR + mins
}

export default minutesOf

// minutesOf is the one `HH:mm` parser of the availability domain: a strict 24-hour pattern
// check, then hours times sixty plus minutes. Every other unit measures through it.
