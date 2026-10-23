import type { Weekday } from '../types'

type OverlapCandidate = {
  weekday: Weekday
  start: number | null
  end: number | null
}

/** Whether two already-parsed ranges collide: same weekday, overlapping minutes. A malformed or
 *  zero/negative-length side never counts as an overlap — `validateRanges` reports those on its
 *  own. Touching ranges (one ends exactly when the other starts) do not collide either. */
export default function hasOverlap(a: OverlapCandidate, b: OverlapCandidate): boolean {
  const { weekday: weekdayA, start: startA, end: endA } = a
  const { weekday: weekdayB, start: startB, end: endB } = b
  if (startA === null || endA === null) return false
  if (startB === null || endB === null) return false
  if (endA <= startA || endB <= startB) return false
  return weekdayA === weekdayB && startA < endB && startB < endA
}
