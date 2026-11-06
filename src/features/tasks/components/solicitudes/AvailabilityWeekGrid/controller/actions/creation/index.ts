import createRange from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/range-operations/create'
import { minutesOf, endMinutesOf, type AvailabilityDay } from '@/features/tasks/utils/availability'
import type { MinuteBounds } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/types'
import type { AddRangeControlRange } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/AddRangeControl/types'
import type { GridActionContext, GridActions } from '../types'

function boundsOf(slot: AddRangeControlRange): MinuteBounds | null {
  const start = minutesOf(slot.startsAt)
  const end = endMinutesOf(slot.endsAt)

  if (start === null || end === null) return null

  return { start, end }
}

function nextRanges(
  context: GridActionContext, day: AvailabilityDay, slot: AddRangeControlRange,
) {
  const bounds = boundsOf(slot)

  if (!bounds) return null
  const input = { day, bounds, ranges: context.ranges }

  return createRange(input)
}

function addRange(context: GridActionContext, day: AvailabilityDay, slot: AddRangeControlRange) {
  const next = nextRanges(context, day, slot)

  if (!next) return

  context.onChange(next)
  context.select(next[next.length - 1].clientId)
}

/** The keyboard path for adding a day's next free range, reusing the same whole-week
 *  validation gate pointer creation and resizing already go through. */
export default function creation(context: GridActionContext): Pick<GridActions, 'onAdd'> {
  const onAdd = (day: AvailabilityDay, slot: AddRangeControlRange) => {
    if (context.readOnly) return

    addRange(context, day, slot)
  }

  return { onAdd }
}

// Keyboard-created ranges reuse the pointer path's identity and validation, closing only
// through the same whole-week gate so a stray keystroke can never leave a half-written week.
