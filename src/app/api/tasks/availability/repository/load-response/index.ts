import type { SupabaseClient } from '@supabase/supabase-js'
import { RPCS } from '@/shared/schema'
import type { AvailabilityResponse } from '@/features/tasks/data/availability/types'
import toAvailabilityResponse from '@/app/api/tasks/availability/helpers/to-response'

/** Calls `get_visible_weekly_availability()` once and groups it into the shape both `GET` and
 *  the refreshed `PUT` reply need — the SECURITY DEFINER boundary already decided who sees what. */
export default async function loadAvailabilityResponse(
  db: SupabaseClient,
  viewerUserId: string,
): Promise<AvailabilityResponse | null> {
  const { data, error } = await db.rpc(RPCS.getVisibleWeeklyAvailability)

  if (error || !data) return null

  return toAvailabilityResponse(data, viewerUserId)
}

// Converts the visibility RPC's rows once, retaining null as the existing read-failure sentinel.
