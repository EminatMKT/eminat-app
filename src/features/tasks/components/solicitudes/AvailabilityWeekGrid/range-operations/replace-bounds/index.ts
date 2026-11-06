import { hhmmOf } from '@/features/tasks/utils/availability'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import type { MinuteBounds } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/types'
import commitRange from '../validate'

/** Replaces one block's bounds only if the entire week remains valid. */
export default function replaceBounds(
  ranges: EditableRange[],
  range: EditableRange,
  bounds: MinuteBounds,
): EditableRange[] | null {
  const startsAt = hhmmOf(bounds.start)
  const endsAt = hhmmOf(bounds.end)
  const next = ranges.map(item => item.clientId === range.clientId
    ? { ...item, startsAt, endsAt } : item)

  return commitRange(next)
}

// The range identity and note are retained while a resize updates only its times.
