import type { WeeklyAvailabilityRange } from '../types'
import declaredHoursByDay from '../declared-hours-by-day'

/** Total declared hours across the whole week — the sum of every weekday's total, not a separate
 *  calculation, so the two numbers can never drift apart. */
export default function declaredWeeklyHours(ranges: WeeklyAvailabilityRange[]): number {
  const dailyTotals = Object.values(declaredHoursByDay(ranges))

  return dailyTotals.reduce((sum, hours) => sum + (hours ?? 0), 0)
}

// declaredWeeklyHours sums the per-weekday totals of declaredHoursByDay, so the weekly figure is
// derived from the daily ones instead of being measured a second time.
