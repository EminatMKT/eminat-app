import RANGE_FIELD_CONSTANTS from '../constants'
import type { DescribedByIds, DescribedByInput } from './types'

const isDefined = (candidate: string | undefined): candidate is string => candidate !== undefined

/** Links a field's native input to its error paragraph and/or counter through one ids list. */
export default function describedByIds(input: DescribedByInput): DescribedByIds {
  const { id, error, counterText } = input
  const errorId = error ? `${id}${RANGE_FIELD_CONSTANTS.errorSuffix}` : undefined
  const counterId = counterText ? `${id}${RANGE_FIELD_CONSTANTS.counterSuffix}` : undefined
  const ids = [errorId, counterId].filter(isDefined)
  const describedBy = ids.length > 0
    ? ids.join(RANGE_FIELD_CONSTANTS.describedBySeparator)
    : undefined

  return { errorId, counterId, describedBy }
}

// This helper isolates the described-by id bookkeeping so RangeField itself only renders.
