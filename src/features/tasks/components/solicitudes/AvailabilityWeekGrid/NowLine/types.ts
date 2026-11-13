import type { Weekday } from '@/features/tasks/utils/availability/types'

/** The column the line may be drawn on: it only shows when this weekday is today. */
export type NowLineProps = {
  weekday: Weekday
}

/** The clock reading (null until read on the client), the column asking for the line, and the
 *  grid's pixel density. */
export type LineTopInput = NowLineProps & {
  current: Date | null
  pxPerMin: number
}
