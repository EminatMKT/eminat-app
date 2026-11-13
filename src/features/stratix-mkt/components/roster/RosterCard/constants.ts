import type { I18nKey } from '@/shared/i18n'
import type { AvatarStatus } from './types'

/** The empty string: a missing name part, or a class slot left unused. */
export const NO_TEXT = ''

/** Stands in for the email of a member who has an account but no email on record. */
export const MISSING_EMAIL = '—'

/** Avatar status dot per presence state. */
export const AVATAR_STATUS: Record<AvatarStatus, AvatarStatus> = {
  unregistered: 'unregistered',
  online: 'online',
  offline: 'offline',
}

/** Translation keys of the roster card copy. */
export const LEADER_KEY: I18nKey = 'stratix.team.leader'
export const NO_ACCOUNT_KEY: I18nKey = 'stratix.team.noAccountYet'
export const ACTIVE_NOW_KEY: I18nKey = 'stratix.team.activeNow'
export const OFFLINE_KEY: I18nKey = 'stratix.team.offline'
export const ACCOUNT_PENDING_KEY: I18nKey = 'stratix.team.accountPending'
export const IN_PROGRESS_KEY: I18nKey = 'stratix.team.inProgress'
