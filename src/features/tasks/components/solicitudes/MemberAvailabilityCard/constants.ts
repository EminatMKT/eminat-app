import type { I18nKey } from '@/shared/i18n'
import type { DailyHoursStatus } from '@/features/tasks/utils/availability'

/** Week-scoped status copy, parallel to `STATUS_COPY_KEYS` in `utils/availability/day-labels.ts`
 *  but worded for the card's week total instead of one day. */
export const WEEK_STATUS_COPY_KEYS: Record<DailyHoursStatus, I18nKey> = {
  below: 'tasks.availability.weekBelow',
  complete: 'tasks.availability.weekComplete',
  above: 'tasks.availability.weekAbove',
  unavailable: 'tasks.availability.noWorkday',
}

export const CARD_ICON_SIZE = 16

export const EDIT_SCHEDULE_KEY: I18nKey = 'tasks.availability.editSchedule'
export const OPEN_SCHEDULE_KEY: I18nKey = 'tasks.availability.openSchedule'
export const NOT_CONFIGURED_KEY: I18nKey = 'tasks.availability.notConfigured'
