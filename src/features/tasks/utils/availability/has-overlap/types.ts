import type { Weekday } from '../types'

/** One side of an overlap check: a range already parsed to minutes, `null` where it didn't
 *  parse. */
export type OverlapCandidate = {
  weekday: Weekday
  start: number | null
  end: number | null
}

/** Both ends of a candidate that parsed and run forward: the end strictly after the start. */
export type ForwardSpan = {
  start: number
  end: number
}
