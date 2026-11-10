import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { RPCS } from '@/shared/schema'
import {
  EXCLUSION_VIOLATION_CODE,
  INVALID_RANGES_STATUS,
  SAVE_CONFLICT_STATUS,
} from '@/app/api/tasks/availability/constants'
import {
  ANON_KEY,
  ROUTE_URL,
  TEST_ORIGIN,
  VIEWER_ID,
} from '@/app/api/tasks/availability/helpers/test-fixtures/constants'
import storeRanges from '.'

const OK_STATUS = 200
const CONFLICT_STATUS = 409
const ONE_RANGE = { weekday: 1, startsAt: '09:00', endsAt: '12:00' }
const VALID_PAYLOAD = { ranges: [ONE_RANGE] }
const CONFLICT_ERROR = { message: 'overlap', code: EXCLUSION_VIOLATION_CODE }

function responseFor(input: RequestInfo | URL, saveStatus: number, saveBody: unknown) {
  const isSave = String(input).includes(RPCS.replaceOwnWeeklyAvailability)
  const responseInit = { status: isSave ? saveStatus : OK_STATUS }

  return new Response(JSON.stringify(isSave ? saveBody : []), responseInit)
}

function fetchAnswering(saveStatus: number, saveBody: unknown) {
  const answerSave = (input: RequestInfo | URL) => responseFor(input, saveStatus, saveBody)
  const answer = vi.fn(async (input: RequestInfo | URL) => answerSave(input))
  const fetchExtras = { preconnect: vi.fn() }

  return Object.assign(answer, fetchExtras)
}

function contextWith(fetch: ReturnType<typeof fetchAnswering>) {
  const options = { global: { fetch } }
  const db = createClient(TEST_ORIGIN, ANON_KEY, options)

  return { db, viewerUserId: VIEWER_ID }
}

function requestWith(payload: unknown) {
  const requestInit = { method: 'PUT', body: JSON.stringify(payload) }

  return new NextRequest(ROUTE_URL, requestInit)
}

describe('storeRanges', () => {
  it('answers 400 without calling the save RPC when the body is invalid', async () => {
    const fetch = fetchAnswering(OK_STATUS, [])
    const emptyPayload = {}
    const response = await storeRanges(contextWith(fetch), requestWith(emptyPayload))

    expect(response.status).toBe(INVALID_RANGES_STATUS)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('answers the save failure without reloading the availability', async () => {
    const fetch = fetchAnswering(CONFLICT_STATUS, CONFLICT_ERROR)
    const response = await storeRanges(contextWith(fetch), requestWith(VALID_PAYLOAD))

    expect(response.status).toBe(SAVE_CONFLICT_STATUS)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('answers the refreshed availability once the save succeeds', async () => {
    const fetch = fetchAnswering(OK_STATUS, [])
    const response = await storeRanges(contextWith(fetch), requestWith(VALID_PAYLOAD))
    const lastUrl = String(fetch.mock.lastCall?.[0])

    expect(response.status).toBe(OK_STATUS)
    expect(lastUrl).toContain(RPCS.getVisibleWeeklyAvailability)
  })
})
