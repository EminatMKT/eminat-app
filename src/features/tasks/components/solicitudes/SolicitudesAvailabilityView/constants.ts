import type { I18nKey } from '@/shared/i18n'
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

/** Initial screen state: availability still loading, no member's modal open. */
export const INITIAL_SCREEN_STATE: ScreenState = {
  availability: INITIAL_AVAILABILITY_STATE,
  openMemberId: null,
}

/** What the screen says when the availability request fails: what failed and what to do. */
export const LOAD_ERROR_KEY: I18nKey = 'tasks.availability.loadFailed'

/** The screen's own copy: heading, subheading, the member list's name and its empty notice. */
export const AVAILABILITY_VIEW_COPY = {
  title: 'tasks.availability.title',
  sub: 'tasks.availability.sub',
  membersLabel: 'tasks.availability.membersLabel',
  noMembers: 'tasks.availability.noMembers',
} satisfies Record<string, I18nKey>
