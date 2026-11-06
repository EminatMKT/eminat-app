import type { DayCaptionProps } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/DayCaption/types'
import type { GridDayProps } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/types'
import type { TrackInput } from '../types'

/** DayCaption's full prop set for this day: its own weekday plus the day's own ranges and
 *  expected hours, already filtered out of the grid's whole-week props by trackInputOf. */
export default function headerProps(
  props: GridDayProps,
  { dayRanges }: TrackInput,
): DayCaptionProps {
  const fields = {
    day: props.day,
    ranges: dayRanges,
    expectedHours: props.workday?.hoursPerDay ?? null,
  }

  return fields
}

// Kept apart from GridDay itself so each stays within its own ten-line budget.
