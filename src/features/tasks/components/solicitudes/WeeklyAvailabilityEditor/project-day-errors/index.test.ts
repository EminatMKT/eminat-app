import { describe, expect, it } from 'vitest'
import type { RangeValidationError } from '@/features/tasks/utils/availability'
import projectDayErrors from '.'

describe('projectDayErrors', () => {
  it('returns only the error that belongs to the exact range index asked for', () => {
    const errors: RangeValidationError[] = [
      { code: 'invalid-time', rangeIndex: 1 },
      { code: 'overlap', rangeIndex: 2, conflictingRangeIndex: 0 },
    ]

    expect(projectDayErrors({ errors, rangeIndex: 1 })).toEqual([
      { code: 'invalid-time', rangeIndex: 1 },
    ])
  })

  it('returns every error attached to that range when it carries more than one', () => {
    const errors: RangeValidationError[] = [
      { code: 'end-not-after-start', rangeIndex: 2 },
      { code: 'overlap', rangeIndex: 2, conflictingRangeIndex: 0 },
    ]

    expect(projectDayErrors({ errors, rangeIndex: 2 })).toEqual(errors)
  })

  it('returns an empty list for a range with no error, with no local-day index involved', () => {
    const errors: RangeValidationError[] = [
      { code: 'invalid-time', rangeIndex: 1 },
    ]

    expect(projectDayErrors({ errors, rangeIndex: 0 })).toEqual([])
  })
})
