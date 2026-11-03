import type { AvailabilityDay, WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'

export type AddRangeControlRange = {
  startsAt: string
  endsAt: string
}

export type AddRangeControlProps = {
  day: AvailabilityDay
  ranges: WeeklyAvailabilityRange[]
  onAdd: (range: AddRangeControlRange) => void
}
