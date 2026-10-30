import type { I18nKey } from '@/shared/i18n'

/** The editor-wide banner reports a COUNT of invalid ranges, never the per-range sentence: that
 *  keeps it distinct from both the inline range error and the post-save outcome message. */
export const VALIDATION_SUMMARY_KEY: I18nKey = 'tasks.availability.validationSummary'

export const NO_INVALID_RANGES = 0
