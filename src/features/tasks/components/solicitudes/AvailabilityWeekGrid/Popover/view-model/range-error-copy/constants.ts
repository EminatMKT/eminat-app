import type { I18nKey } from '@/shared/i18n'
import type { RangeValidationError } from '@/features/tasks/utils/availability'
import { AVAILABILITY_RANGE_ITEM_CONSTANTS }
  from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/AvailabilityRangeItem/constants'

type RangeErrorCode = RangeValidationError['code']

/** The ONE sentence naming each validateRanges error — never the generic "fix this" banner copy,
 *  so a range's inline error says exactly what is wrong with it. */
export const RANGE_ERROR_COPY_KEYS: Record<RangeErrorCode, I18nKey> = {
  [AVAILABILITY_RANGE_ITEM_CONSTANTS.invalidTimeCode]: 'tasks.availability.invalidTime',
  [AVAILABILITY_RANGE_ITEM_CONSTANTS.endNotAfterStartCode]: 'tasks.availability.endNotAfterStart',
  [AVAILABILITY_RANGE_ITEM_CONSTANTS.overlapCode]: 'tasks.availability.overlap',
}

/** When a range carries more than one error, report the most fundamental one first: an
 *  unparsable time before an ordering problem, an ordering problem before an overlap. */
export const RANGE_ERROR_CODE_PRIORITY: RangeErrorCode[] = [
  AVAILABILITY_RANGE_ITEM_CONSTANTS.invalidTimeCode,
  AVAILABILITY_RANGE_ITEM_CONSTANTS.endNotAfterStartCode,
  AVAILABILITY_RANGE_ITEM_CONSTANTS.overlapCode,
]
