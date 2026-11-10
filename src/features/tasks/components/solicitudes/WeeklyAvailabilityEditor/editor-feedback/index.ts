import { countInvalidRanges, type RangeValidationError } from '@/features/tasks/utils/availability'
import { NO_INVALID_RANGES, VALIDATION_SUMMARY_KEY } from './constants'
import type { Translator } from '../types'

/** Builds the validation banner's message: a COUNT of invalid ranges (distinct `rangeIndex`
 *  values), never the per-range sentence the grid's own popover already shows. */
export default function buildValidationMessage(
  translate: Translator,
  errors: RangeValidationError[],
): string | null {
  if (countInvalidRanges(errors) === NO_INVALID_RANGES) return null
  const summaryVars = { count: countInvalidRanges(errors) }

  return translate(VALIDATION_SUMMARY_KEY, summaryVars)
}

// Isolated so index.tsx stays a thin composition; this is its only remaining feedback concern.
