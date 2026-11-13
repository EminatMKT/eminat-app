import { SNAP_MINUTES } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/constants'
import snapMinutesDown from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/snap-down'
import snapMinutesUp from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/snap-up'
import type { MinuteBounds } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/types'

/** The free-form range a drag creates between `originMinute` and `currentMinute`, in either
 *  order, snapped to the half hour on both ends and clamped so it never collapses below one
 *  snap step nor crosses `bounds` (the day edges or a neighboring range). */
export default function dragCreateRange(
  { start: minStart, end: maxEnd }: MinuteBounds,
  originMinute: number,
  currentMinute: number,
): MinuteBounds {
  const low = Math.min(originMinute, currentMinute)
  const high = Math.max(originMinute, currentMinute)
  const start = Math.max(snapMinutesDown(low), minStart)
  const minEnd = start + SNAP_MINUTES
  const end = Math.min(Math.max(snapMinutesUp(high), minEnd), maxEnd)

  return { start, end: Math.max(end, minEnd) }
}

// This module turns a drag's two endpoints into the snapped, clamped range it should create.
