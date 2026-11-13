import {
  endMinutesOf,
  minutesOf,
  type WeeklyAvailabilityRange,
} from '@/features/tasks/utils/availability'
import { DAY_END_MINUTE, DAY_START_MINUTE, SNAP_MINUTES } from '../constants'
import type { MinuteBounds } from '../types'

/** The open interval around `minute` within one day's ranges, or `null` when the point sits
 *  inside an existing range or the remaining gap is under one snap step. Intervals are
 *  `[start, end)`: a range that touches `minute` exactly at its own edge never occupies it. */
export default function freeWindow(
  dayRanges: WeeklyAvailabilityRange[],
  minute: number,
): MinuteBounds | null {
  const bounds: MinuteBounds = { start: DAY_START_MINUTE, end: DAY_END_MINUTE }
  const isOccupied = dayRanges.some(dayRange => {
    const start = minutesOf(dayRange.startsAt)
    const end = endMinutesOf(dayRange.endsAt)

    if (start === null || end === null) return false

    if (minute >= start && minute < end) return true

    if (end <= minute) bounds.start = Math.max(bounds.start, end)

    if (start > minute) bounds.end = Math.min(bounds.end, start)

    return false
  })

  if (isOccupied || bounds.end - bounds.start < SNAP_MINUTES) return null

  return bounds
}

// This module finds the open window a click or a keyboard create can use around one point.
