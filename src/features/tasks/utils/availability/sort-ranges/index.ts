import type { WeeklyAvailabilityRange } from '../types'

/** Ranges ordered by weekday then start time, without mutating the input — callers that need a
 *  stable display order (the weekly calendar) can sort a copy without re-deriving anything. */
export default function sortRanges(ranges: WeeklyAvailabilityRange[]): WeeklyAvailabilityRange[] {
  return [...ranges].sort((a, b) => a.weekday - b.weekday || a.startsAt.localeCompare(b.startsAt))
}
