import type { AvailabilityDay } from '@/features/tasks/utils/availability'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types/types'
import type { MinuteBounds } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/types'

export type CreateRangeInput = {
  day: AvailabilityDay
  bounds: MinuteBounds
  ranges: EditableRange[]
}
