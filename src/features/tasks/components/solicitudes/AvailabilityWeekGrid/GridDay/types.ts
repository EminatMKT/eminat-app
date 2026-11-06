import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import type useTrack from './use-track'

export type DayRange = EditableRange

export type Translate = (key: string, vars?: Record<string, string>) => string

export type TrackInput = {
  dayRanges: DayRange[]
  columnTop: () => number
  t: Translate
}

export type TrackBundle = ReturnType<typeof useTrack> & { trackInput: TrackInput }
