import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { createClient } from '@supabase/supabase-js'
import loadAvailabilityResponse from '.'

const URL_BASE = 'http://db.test'
const KEY = 'anon-key'
const VIEWER_ID = 'viewer-1'
const FETCH = 'fetch'

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
      hours_per_day: null,
      range_id: null,
      weekday: null,
      starts_at: null,
      ends_at: null,
      note: null,
    }
    vi.spyOn(globalThis, FETCH).mockImplementation(fakeFetch(200, [row]))
    const db = createClient(URL_BASE, KEY)
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
    vi.spyOn(globalThis, FETCH).mockImplementation(fakeFetch(500, rpcError))
    const db = createClient(URL_BASE, KEY)
    const response = await loadAvailabilityResponse(db, VIEWER_ID)
    expect(response).toBeNull()
  })
})
