import SegmentCanvas from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/SegmentCanvas'
import type { GridDayProps } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/types'
import type { DayRange, TrackInput } from '../types'

function renderSegment(props: GridDayProps, dayRanges: DayRange[], columnTop: () => number) {
  const shared = { ...props, dayRanges, columnTop }

  return function Segment(range: DayRange) {
    return <SegmentCanvas key={range.clientId} {...shared} range={range} />
  }
}

/** The day's track body: every declared range as a SegmentCanvas. An empty day renders a bare
 *  track (nothing): the empty state is the single week-level message AvailabilityWeekGrid shows
 *  above the columns, and the empty track itself is where a range gets drawn. */
export default function renderTrack(props: GridDayProps, input: TrackInput) {
  const { dayRanges, columnTop } = input

  if (dayRanges.length === 0) return null

  return dayRanges.map(renderSegment(props, dayRanges, columnTop))
}

// Renders one day column's segments for GridDay; kept apart so GridDay only lays out the column.
