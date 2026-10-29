import type { OverlapError, RangeValidationError } from '@/features/tasks/utils/availability'
import { OVERLAP_CODE, type ProjectDayErrorsInput } from './types'

function isOverlapError(error: RangeValidationError): error is OverlapError {
  return error.code === OVERLAP_CODE
}

export default function projectDayErrors({
  errors,
  ranges,
  weekday,
}: ProjectDayErrorsInput): RangeValidationError[] {
  const dayIndexMap = new Map<number, number>()
  let dayRangeIndex = 0

  ranges.forEach(({ weekday: rangeWeekday }, rangeIndex) => {
    if (rangeWeekday !== weekday) return
    dayIndexMap.set(rangeIndex, dayRangeIndex)
    dayRangeIndex += 1
  })

  const projectedErrors: RangeValidationError[] = []
  for (const error of errors) {
    const projectedRangeIndex = dayIndexMap.get(error.rangeIndex)
    if (projectedRangeIndex === undefined) continue

    if (isOverlapError(error)) {
      const projectedConflictIndex = dayIndexMap.get(error.conflictingRangeIndex)
      if (projectedConflictIndex === undefined) continue
      const projectedOverlapError: OverlapError = {
        code: OVERLAP_CODE,
        rangeIndex: projectedRangeIndex,
        conflictingRangeIndex: projectedConflictIndex,
      }
      projectedErrors.push(projectedOverlapError)
      continue
    }

    const projectedError: RangeValidationError = {
      ...error,
      rangeIndex: projectedRangeIndex,
    }
    projectedErrors.push(projectedError)
  }

  return projectedErrors
}

// This facade projects global validation errors into one weekday's local range coordinates.
