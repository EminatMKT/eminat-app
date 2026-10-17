import type { Pendiente } from '@/shared/dedup/types'
import { PAIR_KEY_SEPARATOR } from './constants'

/** One string per open pair, or `null` with none open: what the decision flags are filed under. */
export default function pairKey(abierto: Pendiente | null): string | null {
  if (!abierto) return null
  const key = [abierto.item_id_a, abierto.item_id_b].join(PAIR_KEY_SEPARATOR)
  return key
}

// Names the open pair for `decisionFor`'s lookup, so a result for pair A never paints pair B.
