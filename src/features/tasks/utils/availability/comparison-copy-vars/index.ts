import type { DailyHoursComparison } from '../types'
import { NO_HOURS } from '../constants'
import type { ComparisonCopyVars } from './types'

/** Resolves a daily comparison into the numbers its status copy interpolates. The difference is
 *  printed unsigned because the message itself already says whether the day is below or above. */
export default function comparisonCopyVars({
  declaredHours,
  expectedHours,
  differenceHours,
}: DailyHoursComparison): ComparisonCopyVars {
  const signedDifference = differenceHours ?? NO_HOURS
  const vars: ComparisonCopyVars = {
    declared: declaredHours,
    expected: expectedHours ?? NO_HOURS,
    difference: Math.abs(signedDifference),
  }
  return vars
}

// comparisonCopyVars turns one day's hour comparison into the declared, expected and unsigned
// difference figures that the below, complete, above and unavailable status messages print.
