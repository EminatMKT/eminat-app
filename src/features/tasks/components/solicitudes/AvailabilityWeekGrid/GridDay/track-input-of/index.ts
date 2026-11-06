import type { GridDayProps } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/types'
import type { Translate, TrackInput } from '../types'

/** The day's own ranges plus the column geometry and translator renderTrack and DayCaption
 *  both need - computed once per render so neither recomputes the filter separately. */
export default function trackInputOf(
  props: GridDayProps,
  columnTop: () => number,
  t: Translate,
): TrackInput {
  const dayRanges = props.ranges.filter(range => range.weekday === props.day.weekday)
  const input = { dayRanges, columnTop, t }

  return input
}

// Kept apart from GridDay itself so each stays within its own ten-line budget.
