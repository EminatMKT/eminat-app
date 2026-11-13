import type { OverlapCandidate } from '../has-overlap/types'

/** Both ends of a range in minutes since midnight, `null` where a value did not parse. */
export type MinutesSpan = Pick<OverlapCandidate, 'start' | 'end'>

/** A range parsed to minutes once, remembering its position in the input. */
export type ParsedRange = OverlapCandidate & {
  rangeIndex: number
}
