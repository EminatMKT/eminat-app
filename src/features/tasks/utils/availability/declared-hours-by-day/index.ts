import type { Weekday, WeeklyAvailabilityRange } from '../types'
import durationHours from '../duration-hours'

/** Declared hours per weekday, summed across every range that falls on it. A weekday with no
 *  ranges is simply absent from the result — callers decide what an absent day means. */
export default function declaredHoursByDay(
  ranges: WeeklyAvailabilityRange[],
): Partial<Record<Weekday, number>> {
  const totals: Partial<Record<Weekday, number>> = {}
  ranges.forEach(range => {
    const previousHours = totals[range.weekday] ?? 0
    totals[range.weekday] = previousHours + durationHours(range)
  })
  return totals
}
