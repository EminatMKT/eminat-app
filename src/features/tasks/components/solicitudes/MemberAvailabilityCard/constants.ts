import type { I18nKey } from '@/shared/i18n'
import type { DailyHoursStatus } from '@/features/tasks/utils/availability'

/** Week-scoped status copy for the card's week total: a jornada sets hours per week, so the
 *  week is the only span ever compared against it. */
export const WEEK_STATUS_COPY_KEYS: Record<DailyHoursStatus, I18nKey> = {
  below: 'tasks.availability.weekBelow',
  complete: 'tasks.availability.weekComplete',
  above: 'tasks.availability.weekAbove',
  unavailable: 'tasks.availability.noWorkday',
}

export const CARD_ICON_SIZE = 16

export const EDIT_SCHEDULE_KEY: I18nKey = 'tasks.availability.editSchedule'
export const OPEN_SCHEDULE_KEY: I18nKey = 'tasks.availability.openSchedule'
export const NO_JORNADA_KEY: I18nKey = 'tasks.availability.declaredWithoutJornada'
