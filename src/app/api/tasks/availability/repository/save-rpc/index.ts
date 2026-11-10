import type { SupabaseClient } from '@supabase/supabase-js'
import { RPCS } from '@/shared/schema'
import type { SaveOwnAvailabilityRange } from '@/features/tasks/data/availability/types'
import respond from '@/app/api/tasks/availability/helpers/respond'
import {
  EXCLUSION_VIOLATION_CODE,
  SAVE_CONFLICT_MESSAGE,
  SAVE_CONFLICT_STATUS,
  SAVE_FAILED_MESSAGE,
  SAVE_FAILED_STATUS,
} from '@/app/api/tasks/availability/constants'

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

function failureFor(code: string) {
  const isConflict = code === EXCLUSION_VIOLATION_CODE

  return isConflict
    ? respond(SAVE_CONFLICT_MESSAGE, SAVE_CONFLICT_STATUS)
    : respond(SAVE_FAILED_MESSAGE, SAVE_FAILED_STATUS)
}

export default async function saveRpc(db: SupabaseClient, ranges: SaveOwnAvailabilityRange[]) {
  const rpcArgs = { p_ranges: ranges.map(toRpcRow) }
  const { error } = await db.rpc(RPCS.replaceOwnWeeklyAvailability, rpcArgs)

  return error ? failureFor(error.code) : null
}

// Calls `replace_own_weekly_availability`, which replaces every range of the caller atomically.
// Answers null on success, else the error response: 409 for the no-overlap SQLSTATE, 400 otherwise.
