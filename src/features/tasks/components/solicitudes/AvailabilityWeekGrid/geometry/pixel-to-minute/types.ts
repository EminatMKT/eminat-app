/** What `pixelToMinute` needs to invert a pointer's `clientY` back into a minute value: the
 *  day column's own top edge and the pixel density it was drawn at. */
export type PixelToMinuteInput = {
  clientY: number
  columnTop: number
  pxPerMin: number
}
