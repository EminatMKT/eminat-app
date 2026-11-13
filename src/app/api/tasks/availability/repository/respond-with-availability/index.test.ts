import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { LOAD_FAILED_STATUS } from '@/app/api/tasks/availability/constants'
import {
  ANON_KEY,
  CACHE_CONTROL_HEADER,
  NO_STORE,
  TEST_ORIGIN,
  VIEWER_ID,
} from '@/app/api/tasks/availability/helpers/test-fixtures/constants'
import respondWithAvailability from '.'

const OK_STATUS = 200
const SERVER_ERROR_STATUS = 500

function clientAnswering(status: number, body: unknown) {
  const responseInit = { status }
  const answer = async () => new Response(JSON.stringify(body), responseInit)
  const fetchExtras = { preconnect: vi.fn() }
  const options = { global: { fetch: Object.assign(answer, fetchExtras) } }

  return createClient(TEST_ORIGIN, ANON_KEY, options)
}

describe('respondWithAvailability', () => {
  it('responds with the load-failed status when the RPC call fails', async () => {
    const rpcError = {
      message: 'boom',
      code: '500',
      hint: null,
      details: null,
    }
    const db = clientAnswering(SERVER_ERROR_STATUS, rpcError)
    const response = await respondWithAvailability(db, VIEWER_ID)

    expect(response.status).toBe(LOAD_FAILED_STATUS)
  })

  it('responds with a no-store JSON payload on success', async () => {
    const row = {
      user_id: VIEWER_ID,
      first_name: 'Ada',
      last_name: 'Lovelace',
      team_id: null,
      team_name: null,
      workday_id: null,
      workday_name: null,
      hours_per_week: null,
      range_id: null,
      weekday: null,
      starts_at: null,
      ends_at: null,
      note: null,
    }
    const db = clientAnswering(OK_STATUS, [row])
    const response = await respondWithAvailability(db, VIEWER_ID)
    const body = await response.json()

    expect(response.headers.get(CACHE_CONTROL_HEADER)).toBe(NO_STORE)
    expect(body.viewerUserId).toBe(VIEWER_ID)
  })
})
