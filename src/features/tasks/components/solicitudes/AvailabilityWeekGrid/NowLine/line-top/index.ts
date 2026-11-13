import minutesToPixels from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/minutes-to-pixels'
import isoWeekday from './iso-weekday'
import minuteOfDay from './minute-of-day'
import type { LineTopInput } from '../types'

/** The line's pixel offset inside today's track, or null on every other column (and before the
 *  clock is read). Same minutes-to-pixels conversion the ranges and the create preview use. */
export default function lineTop({ current, weekday, pxPerMin }: LineTopInput): number | null {
  const isToday = current !== null && isoWeekday(current) === weekday

  if (!isToday) return null

  const top = minutesToPixels(minuteOfDay(current), pxPerMin)

  return top
}

// Kept pure so the weekday match and the offset are tested without a clock or a DOM.
