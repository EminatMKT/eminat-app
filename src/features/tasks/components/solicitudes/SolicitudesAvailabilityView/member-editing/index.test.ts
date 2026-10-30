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

const prevScreen: ScreenState = { availability: INITIAL_AVAILABILITY_STATE, editingMemberId: null }

describe('buildScreenActions', () => {
  it('startEdit opens the given member and leaves the loaded list untouched', () => {
    const setScreen = vi.fn()
    const { startEdit } = buildScreenActions(setScreen)

    startEdit('member-1')

    const updater = setScreen.mock.calls[0][0]
    const next = typeof updater === 'function' ? updater(prevScreen) : updater

    expect(next.editingMemberId).toBe('member-1')
    expect(next.availability).toBe(prevScreen.availability)
  })

  it('cancelEdit closes whichever row was open', () => {
    const setScreen = vi.fn()
    const { cancelEdit } = buildScreenActions(setScreen)
    const openScreen: ScreenState = { ...prevScreen, editingMemberId: 'member-1' }

    cancelEdit()

    const updater = setScreen.mock.calls[0][0]
    const next = typeof updater === 'function' ? updater(openScreen) : updater

    expect(next.editingMemberId).toBeNull()
  })

  it('handleSaved replaces the member list and closes the row', () => {
    const setScreen = vi.fn()
    const { handleSaved } = buildScreenActions(setScreen)
    const response: AvailabilityResponse = { viewerUserId: 'u1', members: [] }

    handleSaved(response)

    expect(setScreen).toHaveBeenCalledWith({
      availability: { status: 'loaded', members: [], error: null },
      editingMemberId: null,
    })
  })
})
