import { SNAP_MINUTES } from '../constants'

/** Rounds a minute value to the nearest half hour. */
export default function snapMinutes(minute: number): number {
  return Math.round(minute / SNAP_MINUTES) * SNAP_MINUTES
}

// This module rounds a pointer or resize minute to the grid's half-hour snap.
