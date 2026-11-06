import { END_OF_DAY_TIME, MINUTES_PER_DAY } from '../constants'
import minutesOf from '../minutes'

/** Parses an availability end, including next-day midnight. */
export default function endMinutesOf(value: string): number | null {
  if (value === END_OF_DAY_TIME) return MINUTES_PER_DAY

  return minutesOf(value)
}

// Only end boundaries can reach the next day; start boundaries keep the shared time parser.
