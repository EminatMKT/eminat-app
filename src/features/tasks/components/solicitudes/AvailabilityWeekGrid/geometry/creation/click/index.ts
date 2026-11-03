import { MAX_CLICK_CREATE_MINUTES } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/constants'
import snapMinutesDown from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/snap-down'
import type { MinuteBounds } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/types'

/** The default block a bare click creates: up to one hour, snapped down from the click point,
 *  shortened to the free room when that room is under an hour, and moved back so it still fits
 *  before the end of a short gap rather than overflowing past it. */
export default function clickCreateRange(
  { start: minStart, end: maxEnd }: MinuteBounds,
  originMinute: number,
): MinuteBounds {
  const duration = Math.min(MAX_CLICK_CREATE_MINUTES, maxEnd - minStart)
  const snapped = snapMinutesDown(originMinute)
  const start = Math.min(Math.max(snapped, minStart), maxEnd - duration)
  const end = start + duration

  return { start, end }
}

// This module turns a single click point into the one-hour-or-less default range.
