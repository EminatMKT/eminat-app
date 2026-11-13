import {
  describe,
  expect,
  it,
} from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { INVALID_RANGES_STATUS } from '@/app/api/tasks/availability/constants'
import { ROUTE_URL } from '../test-fixtures/constants'
import parseRanges from '.'

function putRequest(body: string) {
  const requestInit = { method: 'PUT', body }

  return new NextRequest(ROUTE_URL, requestInit)
}

async function statusOf(body: string) {
  const result = await parseRanges(putRequest(body))

  return result instanceof NextResponse ? result.status : null
}

describe('parseRanges', () => {
  it('returns the schema-trimmed ranges of a valid body', async () => {
    const range = {
      weekday: 1,
      startsAt: '09:00',
      endsAt: '12:00',
      note: '  Notes  ',
    }
    const payload = { ranges: [range] }
    const body = JSON.stringify(payload)
    const expectedRange = {
      weekday: 1,
      startsAt: '09:00',
      endsAt: '12:00',
      note: 'Notes',
    }

    expect(await parseRanges(putRequest(body))).toEqual([expectedRange])
  })

  it('answers 400 when the body is not JSON', async () => {
    const notJson = 'not json'

    expect(await statusOf(notJson)).toBe(INVALID_RANGES_STATUS)
  })

  it('answers 400 when two ranges of the same day overlap', async () => {
    const first = { weekday: 1, startsAt: '09:00', endsAt: '13:00' }
    const second = { weekday: 1, startsAt: '12:00', endsAt: '14:00' }
    const payload = { ranges: [first, second] }
    const body = JSON.stringify(payload)

    expect(await statusOf(body)).toBe(INVALID_RANGES_STATUS)
  })
})
