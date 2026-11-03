import firstFreeWindow from '../first-free-window'
import clickCreateRange from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/creation/click'
import { hhmmOf } from '@/features/tasks/utils/availability'
import type { WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import type { AddRangeControlRange } from '../types'

/** The next default range AddRangeControl offers for a day: the day's first free window,
 *  turned into a one-hour-or-less slot anchored at that window's own start, or null when
 *  there's no room left to offer. */
export default function nextSlot(
  dayRanges: WeeklyAvailabilityRange[],
): AddRangeControlRange | null {
  const window = firstFreeWindow(dayRanges)

  if (window === null) return null

  const slot = clickCreateRange(window, window.start)

  return { startsAt: hhmmOf(slot.start), endsAt: hhmmOf(slot.end) }
}

// nextSlot composes firstFreeWindow, clickCreateRange and hhmmOf into the one default range
// AddRangeControl offers — click-create geometry and HH:mm formatting never duplicate here.
