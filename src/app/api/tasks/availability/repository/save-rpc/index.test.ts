import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { createClient } from '@supabase/supabase-js'
import saveRpc from '.'
import {
  EXCLUSION_VIOLATION_CODE,
  SAVE_CONFLICT_STATUS,
  SAVE_FAILED_STATUS,
} from '@/app/api/tasks/availability/constants'

const URL_BASE = 'http://db.test'
const KEY = 'anon-key'
const FETCH = 'fetch'
const ONE_RANGE = [{
  weekday: 1 as const,
  startsAt: '09:00',
  endsAt: '12:00',
  note: '  Mañanas  ',
}]

function fakeFetch(status: number, body: unknown) {
  return async (_input: RequestInfo | URL, init?: RequestInit) => {
    requestedBodies.push(init?.body ? JSON.parse(String(init.body)) : null)
    const responseBody = JSON.stringify(body)
    const responseInit = { status }
    return new Response(responseBody, responseInit)
  }
}

let requestedBodies: unknown[] = []

afterEach(() => {
  vi.restoreAllMocks()
  requestedBodies = []
})

describe('saveRpc', () => {
  it('sends only the normalized ranges, trimming a blank note to null', async () => {
    vi.spyOn(globalThis, FETCH).mockImplementation(fakeFetch(200, []))
    const db = createClient(URL_BASE, KEY)
    const result = await saveRpc(db, ONE_RANGE)
    expect(result).toBeNull()
    const expectedPayload = {
      p_ranges: [{
        weekday: 1,
        starts_at: '09:00',
        ends_at: '12:00',
        note: 'Mañanas',
      }],
    }
    expect(requestedBodies).toContainEqual(expectedPayload)
  })

  it('maps the exclusion-violation SQLSTATE to a 409 conflict', async () => {
    const conflictError = {
      message: 'overlap',
      code: EXCLUSION_VIOLATION_CODE,
      hint: null,
      details: null,
    }
    vi.spyOn(globalThis, FETCH).mockImplementation(fakeFetch(409, conflictError))
    const db = createClient(URL_BASE, KEY)
    const result = await saveRpc(db, ONE_RANGE)
    expect(result?.status).toBe(SAVE_CONFLICT_STATUS)
  })

  it('maps any other RPC error to a 400 save failure', async () => {
    const otherError = {
      message: 'nope',
      code: '42501',
      hint: null,
      details: null,
    }
    vi.spyOn(globalThis, FETCH).mockImplementation(fakeFetch(403, otherError))
    const db = createClient(URL_BASE, KEY)
    const result = await saveRpc(db, ONE_RANGE)
    expect(result?.status).toBe(SAVE_FAILED_STATUS)
  })
})
