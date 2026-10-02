import type { ActividadResponsable } from '@/features/tasks/types'
function toggleResponsable(rows: ActividadResponsable[], usuarioId: string, checked: boolean): ActividadResponsable[] {
  const exists = rows.some(r => r.usuario_id === usuarioId)
  const shouldAdd = checked && !exists
  if (shouldAdd) return [...rows, { usuario_id: usuarioId, es_lider: false }]
  if (checked) return rows
  return rows.filter(r => r.usuario_id !== usuarioId)
}
function toggleLeader(rows: ActividadResponsable[], usuarioId: string): ActividadResponsable[] {
  const target = rows.find(r => r.usuario_id === usuarioId)
  if (!target) return rows
  const nextLeader = !target.es_lider
  return rows.map(r => {
    const isTarget = r.usuario_id === usuarioId
    return { ...r, es_lider: isTarget ? nextLeader : false }
  })
}
function responsableIds(rows: ActividadResponsable[]): string[] {
  return Array.from(new Set(rows.map(r => r.usuario_id)))
}
function leaderId(rows: ActividadResponsable[]): string | null {
  return rows.find(r => r.es_lider)?.usuario_id ?? null
}
function newlyAddedResponsableIds(
  previous: ActividadResponsable[],
  next: ActividadResponsable[],
  actorId: string | null | undefined,
): string[] {
  const before = new Set(previous.map(r => r.usuario_id))
  return responsableIds(next).filter(id => {
    const isNewForActor = id !== actorId && !before.has(id)
    return isNewForActor
  })
}
const responsablesForm = {
  toggleResponsable,
  toggleLeader,
  responsableIds,
  leaderId,
  newlyAddedResponsableIds,
  alternarResponsable: toggleResponsable,
  alternarLider: toggleLeader,
  idsResponsables: responsableIds,
  idLider: leaderId,
}
export default responsablesForm
