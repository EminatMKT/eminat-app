import { describe, expect, it } from 'vitest'
import type { WeeklyAvailabilityRange } from '../types'
import validateRanges from '.'

describe('validateRanges', () => {
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
