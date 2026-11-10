import {
  DAY_START_MINUTE,
  freeWindow,
  type MinuteBounds,
} from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry'
import { minutesOf, type WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'

const isMinute = (value: number | null): value is number => value !== null

/** The day's earliest open window, or `null` when every point is occupied or too narrow. */
export default function firstFreeWindow(
  dayRanges: WeeklyAvailabilityRange[],
): MinuteBounds | null {
  const candidateEnds = dayRanges.map(range => minutesOf(range.endsAt)).filter(isMinute)
  const candidates = [DAY_START_MINUTE, ...candidateEnds].sort((a, b) => a - b)

  for (const candidate of candidates) {
    const window = freeWindow(dayRanges, candidate)

    if (window !== null) return window
  }

  return null
}

// Finds the day's first free window by probing every point a gap could start at.
