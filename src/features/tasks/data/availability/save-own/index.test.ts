import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { AvailabilityResponse, SaveOwnAvailabilityRange } from '../types'
import { AVAILABILITY_ENDPOINT, SAVE_FAILED_MESSAGE } from '../constants'
import saveOwnAvailability from '.'

const fetchGlobal = 'fetch'

afterEach(() => { vi.unstubAllGlobals() })

const ranges: SaveOwnAvailabilityRange[] = [
  {
    weekday: 1,
    startsAt: '09:00',
    endsAt: '13:00',
    note: null,
  },
]

describe('saveOwnAvailability', () => {
  it('PUTs the caller-supplied ranges and returns the refreshed response', async () => {
    const updated: AvailabilityResponse = { viewerUserId: 'u1', members: [] }
    const okResult = { ok: true, json: async () => updated }
    const fetchMock = vi.fn(async () => okResult)

    vi.stubGlobal(fetchGlobal, fetchMock)
    await expect(saveOwnAvailability(ranges)).resolves.toEqual(updated)

    const requestBody = { ranges }
    const putInit = {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    }

    expect(fetchMock).toHaveBeenCalledWith(AVAILABILITY_ENDPOINT, putInit)
  })

  it('throws a stable error code when the save fails', async () => {
    const failedResult = { ok: false, json: async () => ({}) }

    vi.stubGlobal(fetchGlobal, vi.fn(async () => failedResult))
    await expect(saveOwnAvailability(ranges)).rejects.toThrow(SAVE_FAILED_MESSAGE)
  })
})
