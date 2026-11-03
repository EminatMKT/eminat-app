import { SNAP_MINUTES } from '../constants'

/** Floors a minute value to the half hour at or before it. A tiny epsilon keeps an exact
 *  boundary (e.g. 30) from floating down to the previous one due to float rounding. */
export default function snapMinutesDown(minute: number): number {
  const EPSILON = 1e-7

  return Math.floor((minute + EPSILON) / SNAP_MINUTES) * SNAP_MINUTES
}

// This module floors a minute to the half-hour grid, used by a range's start edge.
