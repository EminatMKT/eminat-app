// ── Stratix 360 team-facing exclusions ────────────────────────────────────
//
// Vive acá y no en `stratix-mkt` aunque el nombre diga Stratix: su único consumidor es
// `useTablero`, que se mudó con las tareas. Dejarlo del otro lado cerraba un ciclo entre las
// dos features —`tasks` importando `stratix-mkt/team` mientras `stratix-mkt` importa el
// provider de `tasks`—, y un ciclo entre features cuesta más que un archivo mal bautizado.
// Defense in depth: filter by BOTH normalized name AND email, so we catch
// the person even if the email in usuarios / v_equipo_hoy ever differs from
// what we expect (or comes back null).
const STRATIX360_EXCLUDED_NAMES = new Set(['javier andrade', 'jonathan bula'])
const STRATIX360_EXCLUDED_EMAILS = new Set([
  'javier@emc.health',
  'javier@eminat.net',
  'jonathan@eminat.net',
])

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
