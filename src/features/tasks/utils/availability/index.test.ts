import { describe, expect, it } from 'vitest'
import {
  compareDailyHours,
  declaredHoursByDay,
  declaredWeeklyHours,
  durationHours,
  sortRanges,
  validateRanges,
  type Weekday,
  type WeeklyAvailabilityRange,
} from '.'

const range = (
  weekday: Weekday,
  startsAt: string,
  endsAt: string,
  note: string | null = null,
): WeeklyAvailabilityRange => ({ weekday, startsAt, endsAt, note })

describe('weekly availability domain', () => {
  it('calculates duration from canonical HH:mm values', () => {
    expect(durationHours(range(1, '09:00', '13:30'))).toBe(4.5)
  })

  it('adds multiple ranges on the same day and reports the weekly declared total', () => {
    const ranges = [
      range(1, '09:00', '13:00'),
      range(1, '14:00', '18:00', 'Not available for meetings'),
      range(2, '11:00', '15:00'),
    ]

    expect(declaredHoursByDay(ranges)).toEqual({ 1: 8, 2: 4 })
    expect(declaredWeeklyHours(ranges)).toBe(12)
  })

  it('sorts by weekday and start time without mutating the input', () => {
    const ranges = [range(2, '14:00', '18:00'), range(1, '09:00', '13:00')]
    const [original] = ranges
    expect(sortRanges(ranges).map(item => item.weekday)).toEqual([1, 2])
    expect(original?.weekday).toBe(2)
  })

  it('rejects overlaps but allows touching ranges', () => {
    expect(validateRanges([
      range(1, '09:00', '13:00'),
      range(1, '12:30', '14:00'),
    ])).toContainEqual({ code: 'overlap', rangeIndex: 1, conflictingRangeIndex: 0 })

    expect(validateRanges([
      range(1, '09:00', '13:00'),
      range(1, '13:00', '17:00'),
    ])).toEqual([])
  })

  it('rejects malformed, zero-duration, and reversed ranges', () => {
    const [malformed] = validateRanges([range(1, 'nine', '13:00')])
    const [zeroLength] = validateRanges([range(1, '09:00', '09:00')])
    const [reversed] = validateRanges([range(1, '10:00', '09:00')])
    expect(malformed?.code).toBe('invalid-time')
    expect(zeroLength?.code).toBe('end-not-after-start')
    expect(reversed?.code).toBe('end-not-after-start')
  })

  it('ignores notes when calculating hours', () => {
    expect(durationHours(range(1, '09:00', '13:00', 'Class in the afternoon'))).toBe(4)
  })

  it('compares only a declared day with the daily jornada reference', () => {
    expect(compareDailyHours(6, 8)).toEqual({
      declaredHours: 6,
      expectedHours: 8,
      differenceHours: -2,
      status: 'below',
    })
    expect(compareDailyHours(8, 8).status).toBe('complete')
    expect(compareDailyHours(10, 8).status).toBe('above')
    expect(compareDailyHours(6, null).status).toBe('unavailable')
  })
})
