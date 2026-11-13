import type { WeeklyAvailabilityRange } from '../types'
import minutesOf from '../minutes'
import endMinutesOf from '../end-minutes-of'

/** Hours between `startsAt` and `endsAt` for one range. A malformed, zero-duration or reversed
 *  range reports zero — rejecting those is `validateRanges`' job, this one only measures. */
export default function durationHours(range: WeeklyAvailabilityRange): number {
  const start = minutesOf(range.startsAt)
  const end = endMinutesOf(range.endsAt)

  if (start === null || end === null || end <= start) return 0

  return (end - start) / 60
}

// durationHours parses both ends to minutes since midnight (the end may be `24:00`) and divides
// their difference by sixty; anything that does not form a forward span measures zero.
