import type { SupabaseClient } from '@supabase/supabase-js'
import { RPCS } from '@/shared/schema'
import type { SaveOwnAvailabilityRange } from '@/features/tasks/data/availability/types'
import {
  EXCLUSION_VIOLATION_CODE,
  SAVE_CONFLICT_MESSAGE,
  SAVE_CONFLICT_STATUS,
  SAVE_FAILED_MESSAGE,
  SAVE_FAILED_STATUS,
} from '@/app/api/tasks/availability/constants'

type SaveRpcError = { message: string; status: number }

function toRpcRow({
  weekday,
  startsAt,
  endsAt,
  note,
}: SaveOwnAvailabilityRange) {
  const trimmedNote = note?.trim() || null
  const row = {
    weekday,
    starts_at: startsAt,
    ends_at: endsAt,
    note: trimmedNote,
  }
  return row
}

/** Calls `replace_own_weekly_availability`, mapping the no-overlap constraint's SQLSTATE to a
 *  409 and anything else to a 400 — never partial: the RPC replaces the caller's rows atomically. */
export default async function saveRpc(
  db: SupabaseClient,
  ranges: SaveOwnAvailabilityRange[],
): Promise<SaveRpcError | null> {
  const rpcRows = ranges.map(toRpcRow)
  const rpcArgs = { p_ranges: rpcRows }
  const { error } = await db.rpc(RPCS.replaceOwnWeeklyAvailability, rpcArgs)
  if (!error) return null
  if (error.code === EXCLUSION_VIOLATION_CODE) {
    const conflict: SaveRpcError = { message: SAVE_CONFLICT_MESSAGE, status: SAVE_CONFLICT_STATUS }
    return conflict
  }
  const failure: SaveRpcError = { message: SAVE_FAILED_MESSAGE, status: SAVE_FAILED_STATUS }
  return failure
}
