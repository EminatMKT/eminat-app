import type { ActividadResponsable } from '@/features/tasks/types'

/** Checks a person into the task, or takes them out; a newcomer never arrives as leader. */
export default function toggleResponsable(
  rows: ActividadResponsable[],
  usuarioId: string,
  checked: boolean,
): ActividadResponsable[] {
  const exists = rows.some(r => r.usuario_id === usuarioId)
  const shouldAdd = checked && !exists
  if (shouldAdd) return [...rows, { usuario_id: usuarioId, es_lider: false }]
  if (checked) return rows
  return rows.filter(r => r.usuario_id !== usuarioId)
}

// Taking the leader out takes the crown with them: only a checked person can lead.
