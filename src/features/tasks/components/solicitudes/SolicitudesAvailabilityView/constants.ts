import type { AvailabilityViewState, AvailabilityViewStatus, ScreenState } from './types'

export const AVAILABILITY_VIEW_STATUS = {
  loading: 'loading',
  error: 'error',
  empty: 'empty',
  loaded: 'loaded',
} satisfies Record<AvailabilityViewStatus, AvailabilityViewStatus>

export const INITIAL_AVAILABILITY_STATE: AvailabilityViewState = {
  status: AVAILABILITY_VIEW_STATUS.loading,
  members: [],
  error: null,
}

/** Initial screen state: availability still loading, no row open for editing. */
export const INITIAL_SCREEN_STATE: ScreenState = {
  availability: INITIAL_AVAILABILITY_STATE,
  editingMemberId: null,
}
