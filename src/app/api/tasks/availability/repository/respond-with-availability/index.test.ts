import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { createClient } from '@supabase/supabase-js'
import respondWithAvailability from '.'
import { LOAD_FAILED_STATUS } from '@/app/api/tasks/availability/constants'

const URL_BASE = 'http://db.test'
const KEY = 'anon-key'
const VIEWER_ID = 'viewer-1'
const FETCH = 'fetch'
const NO_STORE = 'no-store'
const CACHE_CONTROL_HEADER = 'cache-control'

function fakeFetch(status: number, body: unknown) {
  return async () => {
    const responseBody = JSON.stringify(body)
    const responseInit = { status }
    return new Response(responseBody, responseInit)
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('respondWithAvailability', () => {
  it('responds with the load-failed status when the RPC call fails', async () => {
    const rpcError = {
      message: 'boom',
      code: '500',
      hint: null,
      details: null,
    }
    vi.spyOn(globalThis, FETCH).mockImplementation(fakeFetch(500, rpcError))
    const db = createClient(URL_BASE, KEY)
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
    vi.spyOn(globalThis, FETCH).mockImplementation(fakeFetch(200, [row]))
    const db = createClient(URL_BASE, KEY)
    const response = await respondWithAvailability(db, VIEWER_ID)
    expect(response.headers.get(CACHE_CONTROL_HEADER)).toBe(NO_STORE)
    const body = await response.json()
    expect(body.viewerUserId).toBe(VIEWER_ID)
  })
})
