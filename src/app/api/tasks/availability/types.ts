import type { SupabaseClient } from '@supabase/supabase-js'
import type { Weekday } from '@/features/tasks/utils/availability'

/** One flat row from `get_visible_weekly_availability()`. A member-only row (no ranges yet) has
 *  every range field `null` together — `to-response.ts` groups these by `user_id`. */
export type AvailabilityRow = {
  user_id: string
  first_name: string
  last_name: string
  team_id: string | null
  team_name: string | null
  workday_id: string | null
  workday_name: string | null
  hours_per_day: number | null
  range_id: string | null
  weekday: Weekday | null
  starts_at: string | null
  ends_at: string | null
  note: string | null
}

/** The caller's own Supabase handle plus their resolved `usuarios.id`, once `authorize-viewer.ts`
 *  has confirmed both the module grant and the active profile behind the session. */
export type ViewerContext = { db: SupabaseClient; viewerUserId: string }
