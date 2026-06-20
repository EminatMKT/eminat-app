import { MIEMBROS_REFS } from '@/shared/context/AppContext'

// ── Stratix 360 team-facing exclusions ────────────────────────────────────
// Defense in depth: filter by BOTH normalized name AND email, so we catch
// the person even if the email in usuarios / v_equipo_hoy ever differs from
// what we expect (or comes back null).
//
// Spreadsheet refs (Jonathan_CRM) are excluded separately because the
// Disponibilidad / Team-ranking / Report panels iterate over MIEMBROS_REFS
// keys, not usuarios rows.
const STRATIX360_EXCLUDED_NAMES = new Set(['javier andrade', 'jonathan bula'])
const STRATIX360_EXCLUDED_EMAILS = new Set([
  'javier@emc.health',
  'javier@eminat.net',
  'jonathan@eminat.net',
])
const STRATIX360_EXCLUDED_REFS = new Set(['Jonathan_CRM'])

export function normTeamName(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

export function isExcludedFromStratix360(u?: { nombre?: string | null; apellido?: string | null; email?: string | null } | null): boolean {
  if (!u) return false
  const email = (u.email || '').toLowerCase()
  if (email && STRATIX360_EXCLUDED_EMAILS.has(email)) return true
  const name = normTeamName(`${u.nombre || ''} ${u.apellido || ''}`)
  if (name && STRATIX360_EXCLUDED_NAMES.has(name)) return true
  return false
}

// MIEMBROS_REFS minus the refs that should not appear in team-iteration UIs.
// The MIEMBROS_REFS[ref] LOOKUP (used to display assignee names on historic
// activities) is left untouched, so old tasks still show "Jonathan" instead
// of a raw "Jonathan_CRM" string.
export const ACTIVE_MIEMBROS_REFS: Record<string, string> = Object.fromEntries(
  Object.entries(MIEMBROS_REFS).filter(([ref]) => !STRATIX360_EXCLUDED_REFS.has(ref))
)
