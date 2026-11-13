import {
  endMinutesOf,
  minutesOf,
  type WeeklyAvailabilityRange,
} from '@/features/tasks/utils/availability'
import { DAY_END_MINUTE, DAY_START_MINUTE } from '../constants'
import type { MinuteBounds } from '../types'

/** The `{start, end}` an edge drag on `current` may not cross: the nearest neighbor on each
 *  side, among `otherRanges` (the same day's ranges, already excluding the one being resized).
 *  `current` is the range's bounds at the START of the gesture — stable for its whole drag. */
export default function resizeBounds(
  otherRanges: WeeklyAvailabilityRange[],
  current: MinuteBounds,
): MinuteBounds {
  const bounds: MinuteBounds = { start: DAY_START_MINUTE, end: DAY_END_MINUTE }

  otherRanges.forEach(otherRange => {
    const otherStart = minutesOf(otherRange.startsAt)
    const otherEnd = endMinutesOf(otherRange.endsAt)

    if (otherStart === null || otherEnd === null) return

    if (otherEnd <= current.start) bounds.start = Math.max(bounds.start, otherEnd)

    if (otherStart >= current.end) bounds.end = Math.min(bounds.end, otherStart)
  })

  return bounds
}

// This module finds how far an edge-resize handle may travel before hitting a neighbor.
