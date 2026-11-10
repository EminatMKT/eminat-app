import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { RangeValidationError } from '@/features/tasks/utils/availability'
import { OVERLAP_COPY_KEY } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/constants'
import resolveRangeErrorCopy from './index'
import type { ResolveRangeErrorCopyInput } from './types'

const INVALID_TIME_COPY_KEY = 'tasks.availability.invalidTime'
const END_NOT_AFTER_START_COPY_KEY = 'tasks.availability.endNotAfterStart'
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

    expect(resolveRangeErrorCopy(input)).toBe(INVALID_TIME_COPY_KEY)
  })

  it('translates the end-not-after-start sentence for a reversed range', () => {
    const errors: RangeValidationError[] = [
      { code: 'end-not-after-start', rangeIndex: FIRST_RANGE_INDEX },
    ]
    const input: ResolveRangeErrorCopyInput = { errors, rangeIndex: FIRST_RANGE_INDEX, translate }

    expect(resolveRangeErrorCopy(input)).toBe(END_NOT_AFTER_START_COPY_KEY)
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

    expect(resolveRangeErrorCopy(input)).toBe(OVERLAP_COPY_KEY)
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

    expect(resolveRangeErrorCopy(input)).toBe(END_NOT_AFTER_START_COPY_KEY)
  })
})
