import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { createClient } from '@supabase/supabase-js'
import {
  EXCLUSION_VIOLATION_CODE,
  SAVE_CONFLICT_STATUS,
  SAVE_FAILED_STATUS,
} from '@/app/api/tasks/availability/constants'
import { ANON_KEY, TEST_ORIGIN } from '@/app/api/tasks/availability/helpers/test-fixtures/constants'
import saveRpc from '.'

const OK_STATUS = 200
const CONFLICT_STATUS = 409
const FORBIDDEN_STATUS = 403
const ONE_RANGE = [{
  weekday: 1 as const,
  startsAt: '09:00',
  endsAt: '12:00',
  note: '  Mañanas  ',
}]

function fetchAnswering(status: number, body: unknown) {
  const answer = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
    const responseInit = { status }

    return new Response(JSON.stringify(body), responseInit)
  })
  const fetchExtras = { preconnect: vi.fn() }

  return Object.assign(answer, fetchExtras)
}

function clientWith(fetch: ReturnType<typeof fetchAnswering>) {
  const options = { global: { fetch } }

  return createClient(TEST_ORIGIN, ANON_KEY, options)
}

describe('saveRpc', () => {
  it('sends only the normalized ranges, trimming a blank note to null', async () => {
    const expectedPayload = {
      p_ranges: [{
        weekday: 1,
        starts_at: '09:00',
        ends_at: '12:00',
        note: 'Mañanas',
      }],
    }
    const fetch = fetchAnswering(OK_STATUS, [])

    expect(await saveRpc(clientWith(fetch), ONE_RANGE)).toBeNull()

    const sentBodies = fetch.mock.calls.map(([, init]) => init?.body)

    expect(sentBodies).toContain(JSON.stringify(expectedPayload))
  })

  it('maps the exclusion-violation SQLSTATE to a 409 conflict', async () => {
    const conflictError = {
      message: 'overlap',
      code: EXCLUSION_VIOLATION_CODE,
      hint: null,
      details: null,
    }
    const db = clientWith(fetchAnswering(CONFLICT_STATUS, conflictError))
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
    const db = clientWith(fetchAnswering(FORBIDDEN_STATUS, otherError))
    const result = await saveRpc(db, ONE_RANGE)

    expect(result?.status).toBe(SAVE_FAILED_STATUS)
  })
})
