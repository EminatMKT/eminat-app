import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'

export type DayRange = EditableRange

export type Translate = (key: string) => string

export type TrackInput = {
  dayRanges: DayRange[]
  columnTop: () => number
  t: Translate
}
