import type { NormalizedResponsibles, ResponsiblesRequest } from './types'

/** Reduces the legacy single id or the new array to one set plus leader; null when the request does not touch them. */
const normalizeResponsibles = ({ responsable_id, responsable_ids, lider_id }: ResponsiblesRequest): NormalizedResponsibles | null => {
  const legacyIds = responsable_id ? [responsable_id] : null
  const ids = responsable_ids ?? legacyIds
  if (!ids) return null
  const normalized: NormalizedResponsibles = { ids: Array.from(new Set(ids)), leaderId: lider_id ?? null }
  return normalized
}

export default normalizeResponsibles
