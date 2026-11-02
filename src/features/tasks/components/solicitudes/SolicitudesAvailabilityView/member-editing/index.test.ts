import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { AvailabilityResponse } from '@/features/tasks/data/availability/types'
import { INITIAL_AVAILABILITY_STATE } from '../constants'
import type { ScreenState } from '../types'
import buildScreenActions from '.'

const prevScreen: ScreenState = { availability: INITIAL_AVAILABILITY_STATE, openMemberId: null }

describe('buildScreenActions', () => {
  it('openMember opens the given member and leaves the loaded list untouched', () => {
    const setScreen = vi.fn()
    const { openMember } = buildScreenActions(setScreen)

    openMember('member-1')

    const updater = setScreen.mock.calls[0][0]
    const next = typeof updater === 'function' ? updater(prevScreen) : updater

    expect(next.openMemberId).toBe('member-1')
    expect(next.availability).toBe(prevScreen.availability)
  })

  it('closeMember closes whichever member was open', () => {
    const setScreen = vi.fn()
    const { closeMember } = buildScreenActions(setScreen)
    const openScreen: ScreenState = { ...prevScreen, openMemberId: 'member-1' }

    closeMember()

    const updater = setScreen.mock.calls[0][0]
    const next = typeof updater === 'function' ? updater(openScreen) : updater

    expect(next.openMemberId).toBeNull()
  })

  it('handleSaved replaces the member list and closes the open member', () => {
    const setScreen = vi.fn()
    const { handleSaved } = buildScreenActions(setScreen)
    const response: AvailabilityResponse = { viewerUserId: 'u1', members: [] }

    handleSaved(response)

    expect(setScreen).toHaveBeenCalledWith({
      availability: { status: 'loaded', members: [], error: null },
      openMemberId: null,
    })
  })
})
