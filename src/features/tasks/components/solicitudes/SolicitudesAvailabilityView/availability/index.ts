import type {
  Dispatch,
  SetStateAction,
} from 'react'
import type { AvailabilityResponse } from '@/features/tasks/data/availability/types'
import { AVAILABILITY_VIEW_STATUS } from '../constants'
import type { AvailabilityViewState } from '../types'

const LOAD_ERROR_KEY = 'tasks.availability.loadFailed'

export default async function loadAvailability(
  setState: Dispatch<SetStateAction<AvailabilityViewState>>,
  fetchAvailability: () => Promise<AvailabilityResponse>,
): Promise<void> {
  try {
    const response = await fetchAvailability()
    const members = response.members
    if (members.length === 0) {
      const emptyState: AvailabilityViewState = {
        status: AVAILABILITY_VIEW_STATUS.empty,
        members,
        error: null,
      }
      setState(emptyState)
      return
    }
    const loadedState: AvailabilityViewState = {
      status: AVAILABILITY_VIEW_STATUS.loaded,
      members,
      error: null,
    }
    setState(loadedState)
  } catch {
    const errorState: AvailabilityViewState = {
      status: AVAILABILITY_VIEW_STATUS.error,
      members: [],
      error: LOAD_ERROR_KEY,
    }
    setState(errorState)
  }
}

// This adapter turns the one visible-availability request into the view's typed state.
