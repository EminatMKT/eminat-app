import type {
  Dispatch,
  SetStateAction,
} from 'react'
import type { AvailabilityResponse } from '@/features/tasks/data/availability/types'
import { AVAILABILITY_VIEW_STATUS, LOAD_ERROR_KEY } from '../constants'
import type { AvailabilityViewState, ScreenState, ViewMember } from '../types'

type FetchAvailability = () => Promise<AvailabilityResponse>

const FAILED_STATE: AvailabilityViewState = {
  status: AVAILABILITY_VIEW_STATUS.error,
  members: [],
  error: LOAD_ERROR_KEY,
}

const { empty, loaded } = AVAILABILITY_VIEW_STATUS

const answeredStateOf = (members: ViewMember[]): AvailabilityViewState => {
  const status = members.length ? loaded : empty
  const state: AvailabilityViewState = { status, members, error: null }

  return state
}

async function fetchState(fetchAvailability: FetchAvailability): Promise<AvailabilityViewState> {
  try {
    const { members } = await fetchAvailability()

    return answeredStateOf(members)
  } catch {
    return FAILED_STATE
  }
}

/** Runs the one visible-availability request and stores its outcome: empty, loaded or failed. */
export default async function loadAvailability(
  setScreen: Dispatch<SetStateAction<ScreenState>>,
  fetchAvailability: FetchAvailability,
): Promise<void> {
  const availability = await fetchState(fetchAvailability)

  setScreen(prev => ({ ...prev, availability }))
}

// This adapter turns the one visible-availability request into the view's typed state.
