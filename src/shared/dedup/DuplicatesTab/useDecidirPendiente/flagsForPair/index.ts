import { IDLE } from '../constants'
import type { EstadoDecidir } from '../types'

/** The decision flags as the open pair should see them: flags filed under another pair read as idle. */
export default function flagsForPair(state: EstadoDecidir, pair: string | null): EstadoDecidir {
  const visible: EstadoDecidir = state.pair === pair ? state : { ...IDLE, pair }
  return visible
}

// Reads `state` through the lens of the pair that is open now, so a stale result that lands
// after the reviewer moved on never paints the newly opened pair.
