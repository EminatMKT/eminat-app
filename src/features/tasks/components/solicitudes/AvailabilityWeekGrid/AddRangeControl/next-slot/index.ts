import firstFreeWindow from '../first-free-window'
import clickCreateRange from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/creation/click'
import { DAY_END_MINUTE, SNAP_MINUTES } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/constants'
import { hhmmOf, type WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import type { AddRangeControlRange } from '../types'

/** The next default range AddRangeControl offers for a day: the day's first free window,
 *  turned into a one-hour-or-less slot anchored at that window's own start, or null when
 *  there's no room left to offer. */
export default function nextSlot(
  dayRanges: WeeklyAvailabilityRange[],
): AddRangeControlRange | null {
  const window = firstFreeWindow(dayRanges)

  if (window === null) return null

  if (window.start >= DAY_END_MINUTE || window.end - window.start < SNAP_MINUTES) return null

  const slot = clickCreateRange(window, window.start)
  const result = { startsAt: hhmmOf(slot.start), endsAt: hhmmOf(slot.end) }

  return result
}

// nextSlot composes firstFreeWindow, clickCreateRange and hhmmOf into the one default range
// AddRangeControl offers — click-create geometry and HH:mm formatting never duplicate here.
