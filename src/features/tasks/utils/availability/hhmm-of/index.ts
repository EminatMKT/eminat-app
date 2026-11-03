import {
  MINUTES_PER_HOUR,
  PAD_CHAR,
  PAD_LENGTH,
  TIME_SEPARATOR,
} from '../constants'

export default function hhmmOf(minute: number): string {
  const hours = Math.floor(minute / MINUTES_PER_HOUR)
  const remainder = minute % MINUTES_PER_HOUR
  const hh = String(hours).padStart(PAD_LENGTH, PAD_CHAR)
  const mm = String(remainder).padStart(PAD_LENGTH, PAD_CHAR)
  const formatted = `${hh}${TIME_SEPARATOR}${mm}`

  return formatted
}

// hhmmOf inverts minutesOf: minutes-since-midnight back to canonical HH:mm.
