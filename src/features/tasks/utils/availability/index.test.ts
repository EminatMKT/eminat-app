import { describe, expect, it } from 'vitest'
import {
  compareDailyHours,
  declaredWeeklyHours,
  validateRanges,
  type DailyHoursStatus,
  type RangeValidationError,
  type WeeklyAvailabilityRange,
} from '.'
import durationHours from './duration-hours'
import declaredHoursByDay from './declared-hours-by-day'
import sortRanges from './sort-ranges'

const mondayMorning: WeeklyAvailabilityRange = { weekday: 1, startsAt: '09:00', endsAt: '13:00' }
const tuesdayAfternoon: WeeklyAvailabilityRange = { weekday: 2, startsAt: '14:00', endsAt: '18:00' }
const invalidTime = 'invalid-time'
const endNotAfterStart = 'end-not-after-start'

describe('weekly availability domain', () => {
  it('calculates duration from canonical HH:mm values', () => {
    const halfPastOne: WeeklyAvailabilityRange = { weekday: 1, startsAt: '09:00', endsAt: '13:30' }

    expect(durationHours(halfPastOne)).toBe(4.5)
  })

  it('adds multiple ranges on the same day and reports the weekly declared total', () => {
    const ranges: WeeklyAvailabilityRange[] = [
      mondayMorning,
      {
        weekday: 1,
        startsAt: '14:00',
        endsAt: '18:00',
        note: 'Not available for meetings',
      },
      { weekday: 2, startsAt: '11:00', endsAt: '15:00' },
    ]

    expect(declaredHoursByDay(ranges)).toEqual({ 1: 8, 2: 4 })
    expect(declaredWeeklyHours(ranges)).toBe(12)
  })

  it('sorts by weekday and start time without mutating the input', () => {
    const ranges = [tuesdayAfternoon, mondayMorning]
    const [original] = ranges

    expect(sortRanges(ranges).map(item => item.weekday)).toEqual([1, 2])
    expect(original?.weekday).toBe(2)
  })

  it('rejects overlaps but allows touching ranges', () => {
    const overlapping: WeeklyAvailabilityRange = { weekday: 1, startsAt: '12:30', endsAt: '14:00' }
    const touching: WeeklyAvailabilityRange = { weekday: 1, startsAt: '13:00', endsAt: '17:00' }
    const overlapError: RangeValidationError = {
      code: 'overlap',
      rangeIndex: 1,
      conflictingRangeIndex: 0,
    }

    expect(validateRanges([mondayMorning, overlapping])).toContainEqual(overlapError)
    expect(validateRanges([mondayMorning, touching])).toEqual([])
  })

  it('rejects malformed, zero-duration, and reversed ranges', () => {
    const malformedRange: WeeklyAvailabilityRange = { weekday: 1, startsAt: 'nine', endsAt: '13:00' }
    const zeroRange: WeeklyAvailabilityRange = { weekday: 1, startsAt: '09:00', endsAt: '09:00' }
    const reversedRange: WeeklyAvailabilityRange = { weekday: 1, startsAt: '10:00', endsAt: '09:00' }
    const [malformed] = validateRanges([malformedRange])
    const [zeroLength] = validateRanges([zeroRange])
    const [reversed] = validateRanges([reversedRange])

    expect(malformed?.code).toBe(invalidTime)
    expect(zeroLength?.code).toBe(endNotAfterStart)
    expect(reversed?.code).toBe(endNotAfterStart)
  })

  it('ignores notes when calculating hours', () => {
    const noted: WeeklyAvailabilityRange = {
      ...mondayMorning,
      note: 'Class in the afternoon',
    }

    expect(durationHours(noted)).toBe(4)
  })

  it('compares only a declared day with the daily jornada reference', () => {
    const below: DailyHoursStatus = 'below'
    const statusCases: [number, number | null, DailyHoursStatus][] = [
      [8, 8, 'complete'],
      [10, 8, 'above'],
      [6, null, 'unavailable'],
    ]

    expect(compareDailyHours(6, 8)).toEqual({
      declaredHours: 6,
      expectedHours: 8,
      differenceHours: -2,
      status: below,
    })

    for (const [declared, expected, status] of statusCases) {
      expect(compareDailyHours(declared, expected).status).toBe(status)
    }
  })
})
