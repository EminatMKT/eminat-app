import type { Pendiente } from '@/shared/dedup/types'
import type { LoadSummaries } from './types'

const NO_SUMMARIES: Record<string, string> = {}

/** Every distinct id's summary for the queue. Never rejects: a failed name read is never a
 *  failed queue, and an id the loader did not return simply stays unnamed. */
export default async function loadNames(pendientes: Pendiente[], loadSummaries: LoadSummaries): Promise<Record<string, string>> {
  const ids = Array.from(new Set(pendientes.flatMap(({ item_id_a, item_id_b }) => [item_id_a, item_id_b])))
  if (ids.length === 0) return NO_SUMMARIES
  const names = await loadSummaries(ids).catch(() => NO_SUMMARIES)
  return names
}

// Collects the queue's ids for the caller's batched name read, and turns its failure into "no
// names" so the list rows fall back to their unavailable label instead of the list failing.
