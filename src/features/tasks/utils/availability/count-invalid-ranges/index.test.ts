import { describe, expect, it } from 'vitest'
import type { RangeValidationError } from '../types'
import countInvalidRanges from './index'

const FIRST_RANGE_INDEX = 0
const SECOND_RANGE_INDEX = 1
const NO_INVALID_RANGES = 0
const SINGLE_INVALID_RANGE = 1
const TWO_INVALID_RANGES = 2

describe('countInvalidRanges', () => {
  it('reports zero when there are no errors', () => {
    expect(countInvalidRanges([])).toBe(NO_INVALID_RANGES)
  })

  it('counts a range once even when it carries two errors', () => {
    const errors: RangeValidationError[] = [
      { code: 'end-not-after-start', rangeIndex: FIRST_RANGE_INDEX },
      { code: 'overlap', rangeIndex: FIRST_RANGE_INDEX, conflictingRangeIndex: SECOND_RANGE_INDEX },
    ]

    expect(countInvalidRanges(errors)).toBe(SINGLE_INVALID_RANGE)
  })

  it('counts each distinct invalid range', () => {
    const errors: RangeValidationError[] = [
      { code: 'invalid-time', rangeIndex: FIRST_RANGE_INDEX },
      { code: 'invalid-time', rangeIndex: SECOND_RANGE_INDEX },
    ]

    expect(countInvalidRanges(errors)).toBe(TWO_INVALID_RANGES)
  })
})
