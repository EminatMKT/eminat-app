import { DAY_END_MINUTE, DAY_START_MINUTE } from '../constants'
import type { PixelToMinuteInput } from './types'

/** Inverts `minutesToPixels`: a pointer's `clientY`, relative to the day column's own top edge,
 *  back into a minute-since-midnight value, clamped to the day's bounds. */
export default function pixelToMinute(input: PixelToMinuteInput): number {
  const { clientY, columnTop, pxPerMin } = input
  const minute = (clientY - columnTop) / pxPerMin

  return Math.min(Math.max(minute, DAY_START_MINUTE), DAY_END_MINUTE)
}

// This module is geometry/minutes-to-pixels' inverse: pixels relative to a column back to a minute.
