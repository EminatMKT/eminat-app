import { URL } from '../constants'
import { H } from '../seed'

// Not imported from `@/shared/data`: that barrel pulls in the Supabase browser client, which
// validates NEXT_PUBLIC_* env vars at import time -- Playwright's Node process has none of
// those (unlike the Next dev server bundle), so the import would crash the test loader itself.
const WEEKLY_AVAILABILITY_RANGES_TABLE = 'user_weekly_availability_ranges'
const USER_ID_LIST_SEPARATOR = ','

/** Deletes all weekly-availability rows for the given users with service_role (bypasses
 *  RLS). Idempotent: used between RLS fixture runs so leftover ranges never leak across
 *  tests. */
export default async function clearWeeklyAvailability(userIds: string[]): Promise<void> {
  if (userIds.length === 0) return
  const idsList = userIds.join(USER_ID_LIST_SEPARATOR)
  const deleteUrl = `${URL}/rest/v1/${WEEKLY_AVAILABILITY_RANGES_TABLE}?user_id=in.(${idsList})`
  const deleteInit = { method: 'DELETE', headers: H }
  const response = await fetch(deleteUrl, deleteInit)
  if (!response.ok) {
    const errorBody = await response.text()
    const errorMessage = `clearWeeklyAvailability: ${response.status} ${errorBody}`
    throw new Error(errorMessage)
  }
}
