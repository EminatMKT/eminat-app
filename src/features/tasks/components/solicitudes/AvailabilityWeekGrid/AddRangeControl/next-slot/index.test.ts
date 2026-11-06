import { describe, expect, it } from 'vitest'
import type { WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import nextSlot from '.'

const MONDAY = 1
const MIDNIGHT_START = '00:00'
const LAST_HALF_HOUR_START = '23:30'
const MIDNIGHT_END = '24:00'
const TOO_SHORT_START = '23:45'
const MIDNIGHT_SLOT_CASE = 'offers the last half-hour through midnight'
const SHORT_WINDOW_CASE = 'does not offer less than a full snap step'

const range = (startsAt: string, endsAt: string): WeeklyAvailabilityRange => ({
  weekday: MONDAY,
  startsAt,
  endsAt,
})

describe('nextSlot', () => {
  it('offers the first hour of an empty day', () => {
    expect(nextSlot([])).toEqual({ startsAt: '00:00', endsAt: '01:00' })
  })

  it('anchors right after an existing range instead of at midnight', () => {
    expect(nextSlot([range('00:00', '09:00')])).toEqual({ startsAt: '09:00', endsAt: '10:00' })
  })

  it(MIDNIGHT_SLOT_CASE, () => {
    const booked = range(MIDNIGHT_START, LAST_HALF_HOUR_START)
    const expected = { startsAt: LAST_HALF_HOUR_START, endsAt: MIDNIGHT_END }

    expect(nextSlot([booked])).toEqual(expected)
  })

  it(SHORT_WINDOW_CASE, () => {
    const booked = range(MIDNIGHT_START, TOO_SHORT_START)

    expect(nextSlot([booked])).toBeNull()
  })

  it('returns null when the day is fully booked', () => {
    expect(nextSlot([range('00:00', '23:59')])).toBeNull()
  })
})
