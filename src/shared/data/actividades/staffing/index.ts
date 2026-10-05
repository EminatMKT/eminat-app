import { supabase } from '@/shared/db/supabase'
import { RPCS } from '@/shared/schema'
import type { ActivityResponsableRow } from '../types'

/** Replaces who executes a task, and who leads it, in one transaction. */
export default function staffing(id: string, rows: ActivityResponsableRow[]) {
  const leader = rows.find(row => row.es_lider)
  const args = {
    p_actividad_id: id,
    p_usuario_ids: rows.map(row => row.usuario_id),
    p_lider_id: leader?.usuario_id ?? null,
  }
  return supabase.rpc(RPCS.setActividadResponsables, args)
}

// The whole set goes to one RPC so a failed save never leaves the task half-assigned: the
// function deletes and inserts inside a single transaction. RLS still applies, because the RPC
// is security invoker — whoever cannot edit the task cannot change its responsables either.
