import type { Pendiente } from '@/shared/dedup/types'

/** The generation to carry into this render: bumped whenever `abierto`'s identity changed since
 *  the last one. Closing always nulls `abierto` first, so reopening the very same pair still
 *  bumps — close and reopen are each a change, even when the reopened object is the same ref. */
export default function nextGeneration(previous: Pendiente | null, current: Pendiente | null, last: number): number {
  const changed = previous !== current
  return changed ? last + 1 : last
}

// Tracks "which opening" a pair is on, independent of the pair's own id — `isSameMoment` is what
// actually compares a captured generation against this one.
