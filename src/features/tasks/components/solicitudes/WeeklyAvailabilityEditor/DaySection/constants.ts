import type { I18nKey } from '@/shared/i18n'

export const DAY_SECTION_CONSTANTS = {
  sectionIdPrefix: 'availability-day-',
  headingTag: 'h2',
  paragraphTag: 'p',
  noProps: null,
  addButtonKind: 'duplicate',
} as const

/** Reports a COUNT of invalid ranges within THIS day only: distinct from both the per-range
 *  sentence AvailabilityRangeItem shows and the editor-wide count in the top banner. */
export const DAY_VALIDATION_SUMMARY_KEY: I18nKey = 'tasks.availability.dayValidationSummary'

export const NO_INVALID_RANGES_IN_DAY = 0
