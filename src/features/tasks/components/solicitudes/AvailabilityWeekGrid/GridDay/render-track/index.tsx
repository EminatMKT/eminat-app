import EDITOR_COPY from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import SegmentCanvas from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/SegmentCanvas'
import type { GridDayProps } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/types'
import type { DayRange, TrackInput } from '../types'

function renderSegment(props: GridDayProps, dayRanges: DayRange[], columnTop: () => number) {
  return (range: DayRange) => (
    <SegmentCanvas
      key={range.clientId}
      {...props}
      range={range}
      dayRanges={dayRanges}
      columnTop={columnTop}
    />
  )
}

/** The day's track body: every declared range as a SegmentCanvas, or a translated empty
 *  message when this day has none - satisfying the no-bare-empty-list affordance. */
export default function renderTrack(props: GridDayProps, input: TrackInput) {
  const { dayRanges, columnTop, t } = input

  if (dayRanges.length === 0) return <p>{t(EDITOR_COPY.emptyDay)}</p>

  return dayRanges.map(renderSegment(props, dayRanges, columnTop))
}

// Kept apart from GridDay itself: the empty-state branch needs EDITOR_COPY, GridDay does not.
