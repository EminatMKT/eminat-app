import { SNAP_MINUTES } from '../constants'

/** Ceils a minute value to the half hour at or after it. A tiny epsilon keeps an exact
 *  boundary (e.g. 30) from floating up to the next one due to float rounding. */
export default function snapMinutesUp(minute: number): number {
  const EPSILON = 1e-7

  return Math.ceil((minute - EPSILON) / SNAP_MINUTES) * SNAP_MINUTES
}

// This module ceils a minute to the half-hour grid, used by a range's end edge.
