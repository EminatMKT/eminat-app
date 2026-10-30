import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { RangeValidationError } from '@/features/tasks/utils/availability'
import resolveRangeErrorCopy from './index'
import type { ResolveRangeErrorCopyInput } from './types'

const FIRST_RANGE_INDEX = 0
const SECOND_RANGE_INDEX = 1
const NO_ERRORS: RangeValidationError[] = []
const translate = vi.fn((key: string) => key)

describe('resolveRangeErrorCopy', () => {
  it('returns undefined when the range has no errors', () => {
    const input: ResolveRangeErrorCopyInput = {
      errors: NO_ERRORS,
      rangeIndex: FIRST_RANGE_INDEX,
      translate,
    }

    expect(resolveRangeErrorCopy(input)).toBeUndefined()
  })

  it('translates the invalid-time sentence for an unparsable range', () => {
    const errors: RangeValidationError[] = [
      { code: 'invalid-time', rangeIndex: FIRST_RANGE_INDEX },
    ]
    const input: ResolveRangeErrorCopyInput = { errors, rangeIndex: FIRST_RANGE_INDEX, translate }

    expect(resolveRangeErrorCopy(input)).toBe('tasks.availability.invalidTime')
  })

  it('translates the end-not-after-start sentence for a reversed range', () => {
    const errors: RangeValidationError[] = [
      { code: 'end-not-after-start', rangeIndex: FIRST_RANGE_INDEX },
    ]
    const input: ResolveRangeErrorCopyInput = { errors, rangeIndex: FIRST_RANGE_INDEX, translate }

    expect(resolveRangeErrorCopy(input)).toBe('tasks.availability.endNotAfterStart')
  })

  it('translates the overlap sentence for a colliding range', () => {
    const errors: RangeValidationError[] = [
      {
        code: 'overlap',
        rangeIndex: FIRST_RANGE_INDEX,
        conflictingRangeIndex: SECOND_RANGE_INDEX,
      },
    ]
    const input: ResolveRangeErrorCopyInput = { errors, rangeIndex: FIRST_RANGE_INDEX, translate }

    expect(resolveRangeErrorCopy(input)).toBe('tasks.availability.overlap')
  })

  it("ignores another range's errors", () => {
    const errors: RangeValidationError[] = [
      { code: 'invalid-time', rangeIndex: SECOND_RANGE_INDEX },
    ]
    const input: ResolveRangeErrorCopyInput = { errors, rangeIndex: FIRST_RANGE_INDEX, translate }

    expect(resolveRangeErrorCopy(input)).toBeUndefined()
  })

  it('reports the most fundamental problem first when a range carries two errors', () => {
    const errors: RangeValidationError[] = [
      { code: 'end-not-after-start', rangeIndex: FIRST_RANGE_INDEX },
      {
        code: 'overlap',
        rangeIndex: FIRST_RANGE_INDEX,
        conflictingRangeIndex: SECOND_RANGE_INDEX,
      },
    ]
    const input: ResolveRangeErrorCopyInput = { errors, rangeIndex: FIRST_RANGE_INDEX, translate }

    expect(resolveRangeErrorCopy(input)).toBe('tasks.availability.endNotAfterStart')
  })
})
