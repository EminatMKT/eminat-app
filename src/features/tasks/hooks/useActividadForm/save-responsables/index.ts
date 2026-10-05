import { actividadesRepo } from '@/shared/data'
import type { ActividadResponsable } from '@/features/tasks/types'

/** `notice` is the notification's title and body, already translated by the caller. */
type SaveResponsablesInput = {
  actividadId: string
  previous: ActividadResponsable[]
  next: ActividadResponsable[]
  actorId: string | undefined
  notice: Record<'titulo' | 'mensaje', string>
}

export type SaveResponsablesResult = { error: string | null; updatedAt: string | null }

/** Saves assignments. Database triggers queue bell and email notices for changes only. */
export default async function saveResponsables(input: SaveResponsablesInput): Promise<SaveResponsablesResult> {
  const { actividadId, next } = input
  const saved = await actividadesRepo.setResponsables(actividadId, next)
  if (saved.error) return { error: saved.error.message, updatedAt: null }
  const updatedAt = (saved.data as string | null) ?? null

  // Immediate delivery shares the same atomic outbox claim as the cron worker.
  // A mail outage cannot roll back a successfully saved assignment.
  await fetch('/api/tasks/notifications/process', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activityId: actividadId }),
  }).catch(() => null)

  // The assignment INSERT trigger owns bell and outbox delivery for every
  // write path, including Meet. Sending here would duplicate the bell.
  return { error: null, updatedAt }
}

// The RPC diffs the existing set and returns a fresh optimistic-lock version.
