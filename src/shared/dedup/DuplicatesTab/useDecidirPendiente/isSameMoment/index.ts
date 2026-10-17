import type { PairMoment } from '../types'

/** Whether a result kicked off at `requested` still belongs to what's open now. A pair that
 *  closed and reopened carries a new generation even when it's the exact same pair again. */
export default function isSameMoment(requested: PairMoment, current: PairMoment): boolean {
  const same = requested.pair === current.pair && requested.generation === current.generation
  return same
}

// The actual staleness check `settle` runs: both the pair and the generation it was requested
// on must still match what's open now, or the result belongs to an attempt nobody is watching.
