import type { ActividadResponsable } from '@/features/tasks/types'

/** Who joined the task between two saves, without repeats and without whoever made the change. */
export default function newlyAddedResponsableIds(
  previous: ActividadResponsable[],
  next: ActividadResponsable[],
  actorId: string | null | undefined,
): string[] {
  const before = new Set(previous.map(r => r.usuario_id))
  const nextIds = Array.from(new Set(next.map(r => r.usuario_id)))
  return nextIds.filter(id => {
    const isNewForActor = id !== actorId && !before.has(id)
    return isNewForActor
  })
}

// These are the people who get the "assigned" notification: someone removed is not notified, and
// the person who assigned themselves does not need to be told.
