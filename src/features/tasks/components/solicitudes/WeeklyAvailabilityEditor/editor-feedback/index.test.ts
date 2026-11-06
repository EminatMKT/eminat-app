import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { RangeValidationError } from '@/features/tasks/utils/availability'
import { VALIDATION_SUMMARY_KEY } from './constants'
import buildValidationMessage from './index'

const FIRST_RANGE_INDEX = 0
const SECOND_RANGE_INDEX = 1
const SINGLE_INVALID_RANGE_COUNT = 1
const NO_ERRORS: RangeValidationError[] = []
const translate = vi.fn((key: string) => key)

describe('buildValidationMessage', () => {
  it('reports no message when there are no validation errors', () => {
    const message = buildValidationMessage(translate, NO_ERRORS)

    expect(message).toBeNull()
  })

  it('reports a count summary, not the per-range sentence, when ranges are invalid', () => {
    const errors: RangeValidationError[] = [
      { code: 'end-not-after-start', rangeIndex: FIRST_RANGE_INDEX },
    ]

    const message = buildValidationMessage(translate, errors)

    expect(message).toBe(VALIDATION_SUMMARY_KEY)
    expect(translate).toHaveBeenCalledWith(
      VALIDATION_SUMMARY_KEY,
      { count: SINGLE_INVALID_RANGE_COUNT },
    )
  })

  it('counts distinct ranges once even when one range carries two errors', () => {
    const errors: RangeValidationError[] = [
      { code: 'end-not-after-start', rangeIndex: FIRST_RANGE_INDEX },
      {
        code: 'overlap',
        rangeIndex: FIRST_RANGE_INDEX,
        conflictingRangeIndex: SECOND_RANGE_INDEX,
      },
    ]

    buildValidationMessage(translate, errors)

    expect(translate).toHaveBeenCalledWith(
      VALIDATION_SUMMARY_KEY,
      { count: SINGLE_INVALID_RANGE_COUNT },
    )
  })
})

// Verifies only the validation-count message; EditorActions has its own rendering unit.
