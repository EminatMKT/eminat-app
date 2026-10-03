import { actividadesRepo, notificacionesRepo } from '@/shared/data'
import { newlyAddedResponsableIds } from '../responsables'
import type { ActividadResponsable } from '@/features/tasks/types'

/** `notice` is the notification's title and body, already translated by the caller. */
type SaveResponsablesInput = {
  actividadId: string
  previous: ActividadResponsable[]
  next: ActividadResponsable[]
  actorId: string | undefined
  notice: Record<'titulo' | 'mensaje', string>
}

const NOTICE_TYPE = 'tarea_asignada'

/** Saves the task's responsables and notifies the newly added ones; returns the first error. */
export default async function saveResponsables(input: SaveResponsablesInput): Promise<string | null> {
  const { actividadId, previous, next, actorId, notice } = input
  const saved = await actividadesRepo.setResponsables(actividadId, next)
  if (saved.error) return saved.error.message

  const recipients = newlyAddedResponsableIds(previous, next, actorId)
  if (recipients.length === 0) return null

  const rows = recipients.map(usuarioId => {
    const row = {
      usuario_id: usuarioId,
      tipo: NOTICE_TYPE,
      ...notice,
      actividad_id: actividadId,
      leida: false,
    }
    return row
  })
  const sent = await notificacionesRepo.insert(rows)
  return sent.error?.message ?? null
}

// saveResponsables is the single write path for who is on a task: the set goes through the
// atomic RPC first, and only people who were not there before get a notification.
