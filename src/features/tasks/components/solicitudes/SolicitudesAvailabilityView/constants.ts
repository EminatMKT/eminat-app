import type { AvailabilityViewState, AvailabilityViewStatus } from './types'

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
