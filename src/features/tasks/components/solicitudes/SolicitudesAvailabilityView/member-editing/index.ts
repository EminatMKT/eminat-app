import type { Dispatch, SetStateAction } from 'react'
import type { AvailabilityResponse } from '@/features/tasks/data/availability/types'
import { AVAILABILITY_VIEW_STATUS } from '../constants'
import type { AvailabilityViewState, ScreenState } from '../types'

type ScreenActions = {
  startEdit: (memberId: string) => void
  cancelEdit: () => void
  handleSaved: (response: AvailabilityResponse) => void
}

/** Builds the three screen-level actions a member row needs: open its editor, close it, and
 *  absorb a successful save back into the loaded list. A self-replace save response always
 *  carries the caller's full member list, so the result is always `loaded`, never `empty`. */
export default function buildScreenActions(
  setScreen: Dispatch<SetStateAction<ScreenState>>,
): ScreenActions {
  const startEdit = (memberId: string) => {
    setScreen(prev => ({ ...prev, editingMemberId: memberId }))
  }
  const cancelEdit = () => setScreen(prev => ({ ...prev, editingMemberId: null }))

  const handleSaved = (response: AvailabilityResponse) => {
    const loadedAvailability: AvailabilityViewState = {
      status: AVAILABILITY_VIEW_STATUS.loaded,
      members: response.members,
      error: null,
    }
    const loadedScreen: ScreenState = { availability: loadedAvailability, editingMemberId: null }

    setScreen(loadedScreen)
  }

  const actions: ScreenActions = { startEdit, cancelEdit, handleSaved }

  return actions
}

// Builds the three screen-level actions wired into SolicitudesAvailabilityView's member rows.
