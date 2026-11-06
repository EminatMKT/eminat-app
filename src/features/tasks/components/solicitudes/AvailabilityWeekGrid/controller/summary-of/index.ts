import { declaredWeeklyHours, type WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import EDITOR_COPY from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import type { Translate } from '../types'

/** The week's declared-hours total and the message shown for a day with zero ranges, both
 *  translated once so index.tsx never builds this copy on its own. */
export default function summaryOf(ranges: WeeklyAvailabilityRange[], t: Translate) {
  const summaryVars = { hours: declaredWeeklyHours(ranges) }
  const total = t(EDITOR_COPY.weeklyHoursKey, summaryVars)
  const empty = t(EDITOR_COPY.emptyDay)

  return { total, empty }
}

// Matches index.test.tsx's own EDITOR_COPY.weeklyHoursKey/emptyDay contract exactly.
