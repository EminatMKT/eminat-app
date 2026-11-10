import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { AvailabilityResponse } from '../types'
import { AVAILABILITY_ENDPOINT, LOAD_FAILED_MESSAGE } from '../constants'
import fetchVisibleAvailability from '.'

const fetchGlobal = 'fetch'

afterEach(() => { vi.unstubAllGlobals() })

describe('fetchVisibleAvailability', () => {
  it('loads the viewer-visible availability with no HTTP cache', async () => {
    const response: AvailabilityResponse = { viewerUserId: 'u1', members: [] }
    const okResult = { ok: true, json: async () => response }
    const fetchMock = vi.fn(async () => okResult)

    vi.stubGlobal(fetchGlobal, fetchMock)
    await expect(fetchVisibleAvailability()).resolves.toEqual(response)

    const noStoreInit = { cache: 'no-store' }

    expect(fetchMock).toHaveBeenCalledWith(AVAILABILITY_ENDPOINT, noStoreInit)
  })

  it('throws a stable error code when the request fails', async () => {
    const failedResult = { ok: false, json: async () => ({}) }

    vi.stubGlobal(fetchGlobal, vi.fn(async () => failedResult))
    await expect(fetchVisibleAvailability()).rejects.toThrow(LOAD_FAILED_MESSAGE)
  })
})
