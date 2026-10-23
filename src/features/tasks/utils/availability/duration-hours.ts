import type { WeeklyAvailabilityRange } from './types'
import minutesOf from './minutes'

/** Hours between `startsAt` and `endsAt` for one range. A malformed, zero-duration or reversed
 *  range reports zero — rejecting those is `validateRanges`' job, this one only measures. */
export default function durationHours(range: WeeklyAvailabilityRange): number {
  const start = minutesOf(range.startsAt)
  const end = minutesOf(range.endsAt)
  if (start === null || end === null || end <= start) return 0
  return (end - start) / 60
}
