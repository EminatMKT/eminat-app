import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { AvailabilityResponse } from '@/features/tasks/data/availability/types'
import { INITIAL_AVAILABILITY_STATE } from '../constants'
import type { ScreenState } from '../types'
import loadAvailability from '.'

const response: AvailabilityResponse = { viewerUserId: 'u1', members: [] }
const prevScreen: ScreenState = { availability: INITIAL_AVAILABILITY_STATE, editingMemberId: null }

describe('loadAvailability', () => {
  it('loads once and reports the empty response state', async () => {
    const setScreen = vi.fn()
    const fetchVisible = vi.fn().mockResolvedValue(response)

    await loadAvailability(setScreen, fetchVisible)

    expect(fetchVisible).toHaveBeenCalledTimes(1)

    const updater = setScreen.mock.calls[0][0]
    const next = typeof updater === 'function' ? updater(prevScreen) : updater

    expect(next.availability).toEqual({ status: 'empty', members: [], error: null })
    expect(next.editingMemberId).toBeNull()
  })
})
