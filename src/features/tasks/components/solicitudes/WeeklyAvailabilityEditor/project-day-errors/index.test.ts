import { describe, expect, it } from 'vitest'
import type { RangeValidationError, WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import projectDayErrors from '.'

const MONDAY = 1
const TUESDAY = 2

const ranges: WeeklyAvailabilityRange[] = [
  { weekday: MONDAY, startsAt: '09:00', endsAt: '12:00' },
  { weekday: TUESDAY, startsAt: '13:00', endsAt: '14:00' },
  { weekday: MONDAY, startsAt: '11:00', endsAt: '13:00' },
]

describe('projectDayErrors', () => {
  it('filters one weekday and rebases every referenced range index', () => {
    const errors: RangeValidationError[] = [
      { code: 'invalid-time', rangeIndex: 1 },
      { code: 'overlap', rangeIndex: 2, conflictingRangeIndex: 0 },
    ]

    expect(projectDayErrors({ errors, ranges, weekday: MONDAY })).toEqual([
      { code: 'overlap', rangeIndex: 1, conflictingRangeIndex: 0 },
    ])
  })

  it('preserves non-overlap error codes after projecting a day', () => {
    const errors: RangeValidationError[] = [
      { code: 'end-not-after-start', rangeIndex: 2 },
    ]

    expect(projectDayErrors({ errors, ranges, weekday: MONDAY })).toEqual([
      { code: 'end-not-after-start', rangeIndex: 1 },
    ])
  })
})
