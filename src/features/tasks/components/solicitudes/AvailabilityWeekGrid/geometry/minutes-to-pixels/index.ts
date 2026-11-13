/** Converts minutes since midnight into pixels, at the pixel density the caller renders with.
 *  Density is never baked in here — the grid's row height is a rendering choice, not geometry. */
export default function minutesToPixels(minute: number, pxPerMin: number): number {
  return minute * pxPerMin
}

// This module is the one place minutes-since-midnight become a pixel offset or height.
