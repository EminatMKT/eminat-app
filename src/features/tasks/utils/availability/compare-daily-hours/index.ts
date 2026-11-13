import type { DailyHoursComparison, DailyHoursStatus } from '../types'
import {
  ABOVE,
  BELOW,
  COMPLETE,
  UNAVAILABLE,
} from './constants'

type HoursGap = Pick<DailyHoursComparison, 'differenceHours' | 'status'>

function decideStatus(differenceHours: number | null): DailyHoursStatus {
  if (differenceHours === null) return UNAVAILABLE

  if (differenceHours < 0) return BELOW

  return differenceHours > 0 ? ABOVE : COMPLETE
}

function gapOf(declaredHours: number, expectedHours: number | null): HoursGap {
  const differenceHours = expectedHours === null ? null : declaredHours - expectedHours
  const gap: HoursGap = { differenceHours, status: decideStatus(differenceHours) }

  return gap
}

/** Compares one day's declared hours against its expected (jornada) hours. `expectedHours: null`
 *  means the day has no jornada reference at all — reported as `unavailable`, not a shortfall. */
export default function compareDailyHours(
  declaredHours: number,
  expectedHours: number | null,
): DailyHoursComparison {
  const comparison: DailyHoursComparison = {
    declaredHours,
    expectedHours,
    ...gapOf(declaredHours, expectedHours),
  }

  return comparison
}

// compareDailyHours subtracts the jornada hours from the declared ones and reads the sign of the
// difference as below, complete or above; a day with no jornada has no difference at all.
