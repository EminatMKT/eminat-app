import type { AvailabilityDay, WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import type { AddRangeControlRange } from '../AddRangeControl/types'

export type DayCaptionProps = {
  day: AvailabilityDay
  ranges: WeeklyAvailabilityRange[]
  expectedHours: number | null
  readOnly: boolean
  onAdd: (range: AddRangeControlRange) => void
}
