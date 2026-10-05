import type { NormalizedResponsibles, ResponsiblesRequest } from './types'

/** Reduces the legacy single id or the new array to one set plus leader; null when the request does not touch them. */
const normalizeResponsibles = ({ responsable_id, responsable_ids, lider_id }: ResponsiblesRequest): NormalizedResponsibles | null => {
  const legacyIds = responsable_id ? [responsable_id] : null
  const ids = responsable_ids ?? legacyIds
  if (!ids) return null
  const unique = Array.from(new Set(ids))
  // Legacy Meet sends only responsable_id. It is the primary, not a leaderless
  // collaborator; arrays without an explicit leader use their first person.
  const normalized: NormalizedResponsibles = { ids: unique, leaderId: lider_id ?? unique[0] ?? null }
  return normalized
}

export default normalizeResponsibles
