import { describe, expect, it } from 'vitest'
import type { WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import nextSlot from '.'

const MONDAY = 1

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

  it('returns null when the day is fully booked', () => {
    expect(nextSlot([range('00:00', '23:59')])).toBeNull()
  })
})
