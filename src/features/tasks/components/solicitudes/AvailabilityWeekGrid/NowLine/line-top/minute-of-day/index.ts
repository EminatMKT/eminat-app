import { MINUTES_PER_HOUR } from './constants'

/** Whole minutes elapsed since local midnight — the same unit every range on the track uses. */
export default function minuteOfDay(date: Date): number {
  const minutes = date.getHours() * MINUTES_PER_HOUR + date.getMinutes()

  return minutes
}

// Local hours on purpose: the grid shows the viewer's wall clock, not UTC.
