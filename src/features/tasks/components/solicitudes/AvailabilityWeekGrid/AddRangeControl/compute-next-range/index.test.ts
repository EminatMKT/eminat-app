import { describe, expect, it } from 'vitest'
import type { WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import computeNextRange from '.'

const MONDAY = 1

const range = (startsAt: string, endsAt: string): WeeklyAvailabilityRange => ({
  weekday: MONDAY,
  startsAt,
  endsAt,
})

describe('computeNextRange', () => {
  it('defaults to a one-hour range starting at midnight on an empty day', () => {
    expect(computeNextRange([])).toEqual({ startsAt: '00:00', endsAt: '01:00' })
  })

  it('starts after an existing range that already occupies the start of the day', () => {
    expect(computeNextRange([range('00:00', '09:00')])).toEqual({
      startsAt: '09:00',
      endsAt: '10:00',
    })
  })

  it('returns null when the day has no free window at all', () => {
    expect(computeNextRange([range('00:00', '23:59')])).toBeNull()
  })
})
