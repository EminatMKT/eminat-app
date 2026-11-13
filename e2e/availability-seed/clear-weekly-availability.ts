import { TABLES } from '@/shared/data/tables'
import { URL } from '../constants'
import { H } from '../seed'

// The `tables` module, not the `@/shared/data` barrel: the barrel pulls in the Supabase browser
// client, which validates NEXT_PUBLIC_* env vars at import time and would crash Playwright.
const RANGES_TABLE = TABLES.weeklyAvailabilityRanges
const USER_ID_LIST_SEPARATOR = ','

async function throwUnlessOk(response: Response): Promise<void> {
  if (response.ok) return

  const errorBody = await response.text()
  const errorMessage = `clearWeeklyAvailability: ${response.status} ${errorBody}`

  throw new Error(errorMessage)
}

/** Deletes all weekly-availability rows for the given users with service_role (bypasses
 *  RLS). Idempotent: used between RLS fixture runs so leftover ranges never leak across
 *  tests. */
export default async function clearWeeklyAvailability(userIds: string[]): Promise<void> {
  if (userIds.length === 0) return

  const idsList = userIds.join(USER_ID_LIST_SEPARATOR)
  const deleteUrl = `${URL}/rest/v1/${RANGES_TABLE}?user_id=in.(${idsList})`
  const deleteInit = { method: 'DELETE', headers: H }
  const response = await fetch(deleteUrl, deleteInit)

  await throwUnlessOk(response)
}
