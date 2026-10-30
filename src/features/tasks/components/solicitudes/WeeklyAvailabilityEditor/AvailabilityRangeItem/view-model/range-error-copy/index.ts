import type { RangeValidationError } from '@/features/tasks/utils/availability'
import { RANGE_ERROR_CODE_PRIORITY, RANGE_ERROR_COPY_KEYS } from './constants'
import type { ResolveRangeErrorCopyInput } from './types'

type MaybeRangeError = RangeValidationError | undefined

const isRangeError = (
  error: MaybeRangeError,
): error is RangeValidationError => error !== undefined

/** Picks the ONE sentence naming a range's specific problem, never the generic "fix this" copy.
 *  RANGE_ERROR_CODE_PRIORITY breaks ties when a range carries more than one error at once. */
export default function resolveRangeErrorCopy(
  input: ResolveRangeErrorCopyInput,
): string | undefined {
  const { errors, rangeIndex, translate } = input
  const rangeErrors = errors.filter(error => error.rangeIndex === rangeIndex)
  const priorityErrors = RANGE_ERROR_CODE_PRIORITY.map(
    code => rangeErrors.find(error => error.code === code),
  )
  const priorityError = priorityErrors.find(isRangeError)

  if (!priorityError) return undefined

  return translate(RANGE_ERROR_COPY_KEYS[priorityError.code])
}

// This module turns a range's error codes into the ONE sentence AvailabilityRangeItem attaches
// to its start/end fields, so a reversed range and an overlapping one no longer read identically.
