/** A closed-open minute interval, `[start, end)`, in minutes since midnight. Shared by every
 *  geometry function that produces or consumes a time window on the grid. */
export type MinuteBounds = {
  start: number
  end: number
}
