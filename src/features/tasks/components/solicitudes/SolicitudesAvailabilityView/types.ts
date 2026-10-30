import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'
import type { I18nKey } from '@/shared/i18n'

export type AvailabilityViewStatus = 'loading' | 'error' | 'empty' | 'loaded'

type AvailabilityStateBase = {
  members: AvailabilityMemberDto[]
}

type LoadingAvailabilityState = AvailabilityStateBase & {
  status: 'loading'
  error: null
}

type ErrorAvailabilityState = AvailabilityStateBase & {
  status: 'error'
  error: I18nKey
}

type EmptyAvailabilityState = AvailabilityStateBase & {
  status: 'empty'
  error: null
}

type LoadedAvailabilityState = AvailabilityStateBase & {
  status: 'loaded'
  error: null
}

export type AvailabilityViewState =
  | LoadingAvailabilityState
  | ErrorAvailabilityState
  | EmptyAvailabilityState
  | LoadedAvailabilityState

/** The view's load status plus which member's row is open for editing: two independent
 *  concerns — what the fetch returned, and what a click selected — kept in one hook. */
export type ScreenState = {
  availability: AvailabilityViewState
  editingMemberId: string | null
}
