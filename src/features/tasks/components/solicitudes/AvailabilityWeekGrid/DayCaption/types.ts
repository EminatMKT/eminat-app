import type { AvailabilityDay, WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'

export type DayCaptionProps = {
  day: AvailabilityDay
  ranges: WeeklyAvailabilityRange[]
  expectedHours: number | null
}
