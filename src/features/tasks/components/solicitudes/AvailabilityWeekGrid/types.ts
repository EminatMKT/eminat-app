import type { AvailabilityWorkdayDto } from '@/features/tasks/data/availability/types'
import type { AvailabilityDay } from '@/features/tasks/utils/availability'
import type { MinuteBounds } from './geometry/types'
import type { FreeSlot } from './next-free-slot/types'
import type { GridSummary } from './controller/types'
import type { EditableRange } from '../WeeklyAvailabilityEditor/component-types/types'

/** The grid owns local selection; its caller owns the whole week's committed ranges. */
export type AvailabilityWeekGridProps = {
  ranges: EditableRange[]
  workday: AvailabilityWorkdayDto | null
  readOnly: boolean
  onChange: (ranges: EditableRange[]) => void
}

export type GridOpenHandler = (range: EditableRange) => void
export type GridCreateHandler = (day: AvailabilityDay, bounds: MinuteBounds, open: boolean) => void
export type GridAddHandler = (day: AvailabilityDay, slot: FreeSlot) => void

export type GridDayProps = AvailabilityWeekGridProps & {
  day: AvailabilityDay
  onOpen: GridOpenHandler
  onCreate: GridCreateHandler
  onAdd: GridAddHandler
}

/** The week's translated summary lines, as the grid controller derives them. */
export type WeekSummaryProps = { summary: GridSummary }

export type SegmentCanvasProps = GridDayProps & {
  range: EditableRange
  dayRanges: EditableRange[]
  columnTop: () => number
}
