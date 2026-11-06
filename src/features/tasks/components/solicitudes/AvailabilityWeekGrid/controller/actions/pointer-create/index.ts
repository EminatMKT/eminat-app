import createRange from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/range-operations/create'
import type { AvailabilityDay } from '@/features/tasks/utils/availability'
import type { MinuteBounds } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/types'
import type { GridActionContext, GridActions } from '../types'

function nextRanges(context: GridActionContext, day: AvailabilityDay, bounds: MinuteBounds) {
  const input = { day, bounds, ranges: context.ranges }

  return createRange(input)
}

function createFromPointer(context: GridActionContext, day: AvailabilityDay, bounds: MinuteBounds) {
  const next = nextRanges(context, day, bounds)

  if (!next) return null

  context.onChange(next)

  return next[next.length - 1]
}

/** The pointer create path: click and drag both append through the same whole-week gate as
 *  the keyboard path; only a drag's `open` flag asks the caller to select what it created. */
export default function pointerCreate(context: GridActionContext): Pick<GridActions, 'onCreate'> {
  const onCreate = (day: AvailabilityDay, bounds: MinuteBounds, open: boolean) => {
    if (context.readOnly) return
    const created = createFromPointer(context, day, bounds)

    if (created && open) context.select(created.clientId)
  }

  return { onCreate }
}

// Pointer-created ranges are always appended last, matching createRange and commitRange.
