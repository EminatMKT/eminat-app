import { describe, expect, it } from 'vitest'
import type { WeeklyAvailabilityRange } from '../types'
import validateRanges from '.'

const MIDNIGHT_END = '24:00'
const AFTER_MIDNIGHT = '24:01'
const INVALID_TIME = 'invalid-time'

describe('validateRanges', () => {
  it('accepts midnight only as an end and allows adjacent late ranges', () => {
    const adjacent: WeeklyAvailabilityRange[] = [
      { weekday: 1, startsAt: '23:00', endsAt: '23:30' },
      { weekday: 1, startsAt: '23:30', endsAt: MIDNIGHT_END },
    ]

    expect(validateRanges(adjacent)).toEqual([])
  })

  it('rejects midnight as a start and times past midnight as an end', () => {
    const midnightStart: WeeklyAvailabilityRange[] = [
      { weekday: 1, startsAt: MIDNIGHT_END, endsAt: MIDNIGHT_END },
    ]
    const lateEnd: WeeklyAvailabilityRange[] = [
      { weekday: 1, startsAt: '23:30', endsAt: AFTER_MIDNIGHT },
    ]

    expect(validateRanges(midnightStart)[0]?.code).toBe(INVALID_TIME)
    expect(validateRanges(lateEnd)[0]?.code).toBe(INVALID_TIME)
  })

  it('rejects overlaps but allows touching ranges', () => {
    const overlapping: WeeklyAvailabilityRange[] = [
      { weekday: 1, startsAt: '09:00', endsAt: '13:00' },
      { weekday: 1, startsAt: '12:30', endsAt: '14:00' },
    ]
    expect(validateRanges(overlapping)).toContainEqual({
      code: 'overlap',
      rangeIndex: 1,
      conflictingRangeIndex: 0,
    })

    const touching: WeeklyAvailabilityRange[] = [
      { weekday: 1, startsAt: '09:00', endsAt: '13:00' },
      { weekday: 1, startsAt: '13:00', endsAt: '17:00' },
    ]
    expect(validateRanges(touching)).toEqual([])
  })

  it('rejects malformed, zero-duration, and reversed ranges', () => {
    const [malformed] = validateRanges([{ weekday: 1, startsAt: 'nine', endsAt: '13:00' }])
    const [zeroLength] = validateRanges([{ weekday: 1, startsAt: '09:00', endsAt: '09:00' }])
    expect(malformed?.code).toBe('invalid-time')
    expect(zeroLength?.code).toBe('end-not-after-start')
  })

  it('allows two touching ranges even when the later one comes first in the input', () => {
    const laterFirst: WeeklyAvailabilityRange[] = [
      { weekday: 1, startsAt: '13:00', endsAt: '17:00' },
      { weekday: 1, startsAt: '09:00', endsAt: '13:00' },
    ]
    expect(validateRanges(laterFirst)).toEqual([])
  })
})
