import type { SupabaseClient } from '@supabase/supabase-js'
import { TABLES, TABLE_COLUMNS } from '@/shared/schema'

const COUNT_ONLY = { count: 'exact', head: true } as const
const { usuarioId } = TABLE_COLUMNS.actividadResponsables
const { solicitanteId } = TABLE_COLUMNS.actividades

/** Requested tasks are not inherited, since the RPC nulls solicitante_id, yet the modal shows them. */
export default async function countUserTasks(db: SupabaseClient, userId: string) {
  const [responsible, requested] = await Promise.all([
    db.from(TABLES.actividadResponsables).select(usuarioId, COUNT_ONLY).eq(usuarioId, userId),
    db.from(TABLES.actividades).select(solicitanteId, COUNT_ONLY).eq(solicitanteId, userId),
  ])
  return { taskCount: responsible.count ?? 0, requestedCount: requested.count ?? 0 }
}

// Counts the tasks a user is tied to, so the delete-user route can offer reassign-and-delete with
// the numbers up-front: responsible ones from the join table, requested ones from actividades.
