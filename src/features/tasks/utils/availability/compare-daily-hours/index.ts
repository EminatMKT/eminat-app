import type { DailyHoursComparison, DailyHoursStatus } from '../types'

function decideStatus(differenceHours: number): DailyHoursStatus {
  if (differenceHours < 0) {
    const below: DailyHoursStatus = 'below'
    return below
  }
  if (differenceHours > 0) {
    const above: DailyHoursStatus = 'above'
    return above
  }
  const complete: DailyHoursStatus = 'complete'
  return complete
}

/** Compares one day's declared hours against its expected (jornada) hours. `expectedHours: null`
 *  means the day has no jornada reference at all — reported as `unavailable`, not a shortfall. */
export default function compareDailyHours(
  declaredHours: number,
  expectedHours: number | null,
): DailyHoursComparison {
  if (expectedHours === null) {
    const unavailable: DailyHoursStatus = 'unavailable'
    const comparison: DailyHoursComparison = {
      declaredHours,
      expectedHours,
      differenceHours: null,
      status: unavailable,
    }
    return comparison
  }

  const differenceHours = declaredHours - expectedHours
  const comparison: DailyHoursComparison = {
    declaredHours,
    expectedHours,
    differenceHours,
    status: decideStatus(differenceHours),
  }
  return comparison
}
