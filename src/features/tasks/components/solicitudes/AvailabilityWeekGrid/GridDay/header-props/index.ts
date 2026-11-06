import type { AddRangeControlRange } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/AddRangeControl/types'
import type { DayCaptionProps } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/DayCaption/types'
import type { GridDayProps } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/types'
import type { TrackInput } from '../types'

function addRangeOf({ day, onAdd }: GridDayProps) {
  return (slot: AddRangeControlRange) => onAdd(day, slot)
}

/** DayCaption's full prop set for this day: its own fields plus onAdd adapted from the grid's
 *  fixed (day, slot) handler into AddRangeControl's single-argument shape. */
export default function headerProps(
  props: GridDayProps,
  { dayRanges }: TrackInput,
): DayCaptionProps {
  const { day, workday, readOnly } = props
  const fields = {
    day,
    ranges: dayRanges,
    expectedHours: workday?.hoursPerDay ?? null,
    readOnly,
    onAdd: addRangeOf(props),
  }

  return fields
}

// Kept apart from GridDay itself so each stays within its own ten-line budget.
