import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { AvailabilityResponse } from '@/features/tasks/data/availability/types'
import loadAvailability from '.'

const response: AvailabilityResponse = { viewerUserId: 'u1', members: [] }

describe('loadAvailability', () => {
  it('loads once and reports the empty response state', async () => {
    const setState = vi.fn()
    const fetchVisible = vi.fn().mockResolvedValue(response)

    await loadAvailability(setState, fetchVisible)

    expect(fetchVisible).toHaveBeenCalledTimes(1)
    expect(setState).toHaveBeenCalledWith({ status: 'empty', members: [], error: null })
  })
})
