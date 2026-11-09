import { declaredWeeklyHours, type WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import type { AvailabilityWorkdayDto } from '@/features/tasks/data/availability/types'
import EDITOR_COPY from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import type { Translate } from '../types'

/** The week's declared-hours total, the message shown for a day with zero ranges, and the one
 *  no-jornada notice (null while a workday is assigned), all translated once so index.tsx never
 *  builds this copy on its own. */
export default function summaryOf(
  ranges: WeeklyAvailabilityRange[],
  workday: AvailabilityWorkdayDto | null,
  t: Translate,
) {
  const summaryVars = { hours: declaredWeeklyHours(ranges) }
  const total = t(EDITOR_COPY.weeklyHoursKey, summaryVars)
  const empty = t(EDITOR_COPY.emptyDay)
  const noJornada = workday === null ? t(EDITOR_COPY.noJornadaAssigned) : null
  const summary = { total, empty, noJornada }

  return summary
}

// Matches index.test.tsx's own EDITOR_COPY.weeklyHoursKey/emptyDay contract exactly.
