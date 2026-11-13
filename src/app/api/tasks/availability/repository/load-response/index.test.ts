import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { createClient } from '@supabase/supabase-js'
import {
  ANON_KEY,
  TEST_ORIGIN,
  VIEWER_ID,
} from '@/app/api/tasks/availability/helpers/test-fixtures/constants'
import loadAvailabilityResponse from '.'

const OK_STATUS = 200
const SERVER_ERROR_STATUS = 500

function clientAnswering(status: number, body: unknown) {
  const responseInit = { status }
  const answer = async () => new Response(JSON.stringify(body), responseInit)
  const fetchExtras = { preconnect: vi.fn() }
  const options = { global: { fetch: Object.assign(answer, fetchExtras) } }

  return createClient(TEST_ORIGIN, ANON_KEY, options)
}

describe('loadAvailabilityResponse', () => {
  it('groups the visible rows into an AvailabilityResponse', async () => {
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
    const response = await loadAvailabilityResponse(db, VIEWER_ID)

    expect(response?.viewerUserId).toBe(VIEWER_ID)
    expect(response?.members).toHaveLength(1)
  })

  it('returns null when the RPC call fails', async () => {
    const rpcError = {
      message: 'boom',
      code: '500',
      hint: null,
      details: null,
    }
    const db = clientAnswering(SERVER_ERROR_STATUS, rpcError)

    expect(await loadAvailabilityResponse(db, VIEWER_ID)).toBeNull()
  })
})
