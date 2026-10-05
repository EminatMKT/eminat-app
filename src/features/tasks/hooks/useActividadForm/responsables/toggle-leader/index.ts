import type { ActividadResponsable } from '@/features/tasks/types'

/** Gives a checked person the crown, taking it from anyone else; pressing it again removes it. */
export default function toggleLeader(rows: ActividadResponsable[], usuarioId: string): ActividadResponsable[] {
  const target = rows.find(r => r.usuario_id === usuarioId)
  if (!target) return rows
  const nextLeader = !target.es_lider
  return rows.map(r => {
    const isTarget = r.usuario_id === usuarioId
    return { ...r, es_lider: isTarget ? nextLeader : false }
  })
}

// Leadership is exclusive and optional: one leader at most, and a task may have none.
