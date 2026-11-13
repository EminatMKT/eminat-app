import { describe, expect, it } from 'vitest'
import type { RangeValidationError, WeeklyAvailabilityRange } from '../types'
import { END_OF_DAY_TIME } from '../constants'
import validateRanges from '.'

const afterMidnight = '24:01'
const INVALID_TIME = 'invalid-time'
const endNotAfterStart = 'end-not-after-start'

describe('validateRanges', () => {
  it('accepts midnight only as an end and allows adjacent late ranges', () => {
    const adjacent: WeeklyAvailabilityRange[] = [
      { weekday: 1, startsAt: '23:00', endsAt: '23:30' },
      { weekday: 1, startsAt: '23:30', endsAt: END_OF_DAY_TIME },
    ]

    expect(validateRanges(adjacent)).toEqual([])
  })

  it('rejects midnight as a start and times past midnight as an end', () => {
    const midnightStart: WeeklyAvailabilityRange[] = [
      { weekday: 1, startsAt: END_OF_DAY_TIME, endsAt: END_OF_DAY_TIME },
    ]
    const lateEnd: WeeklyAvailabilityRange[] = [
      { weekday: 1, startsAt: '23:30', endsAt: afterMidnight },
    ]

    expect(validateRanges(midnightStart)[0]?.code).toBe(INVALID_TIME)
    expect(validateRanges(lateEnd)[0]?.code).toBe(INVALID_TIME)
  })

  it('rejects overlaps but allows touching ranges', () => {
    const overlapping: WeeklyAvailabilityRange[] = [
      { weekday: 1, startsAt: '09:00', endsAt: '13:00' },
      { weekday: 1, startsAt: '12:30', endsAt: '14:00' },
    ]
    const overlapError: RangeValidationError = {
      code: 'overlap',
      rangeIndex: 1,
      conflictingRangeIndex: 0,
    }
    const touching: WeeklyAvailabilityRange[] = [
      { weekday: 1, startsAt: '09:00', endsAt: '13:00' },
      { weekday: 1, startsAt: '13:00', endsAt: '17:00' },
    ]

    expect(validateRanges(overlapping)).toContainEqual(overlapError)
    expect(validateRanges(touching)).toEqual([])
  })

  it('rejects malformed, zero-duration, and reversed ranges', () => {
    const malformedRange: WeeklyAvailabilityRange = { weekday: 1, startsAt: 'nine', endsAt: '13:00' }
    const zeroLengthRange: WeeklyAvailabilityRange = { weekday: 1, startsAt: '09:00', endsAt: '09:00' }
    const [malformed] = validateRanges([malformedRange])
    const [zeroLength] = validateRanges([zeroLengthRange])

    expect(malformed?.code).toBe(INVALID_TIME)
    expect(zeroLength?.code).toBe(endNotAfterStart)
  })

  it('allows two touching ranges even when the later one comes first in the input', () => {
    const laterFirst: WeeklyAvailabilityRange[] = [
      { weekday: 1, startsAt: '13:00', endsAt: '17:00' },
      { weekday: 1, startsAt: '09:00', endsAt: '13:00' },
    ]

    expect(validateRanges(laterFirst)).toEqual([])
  })
})
