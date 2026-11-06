import { describe, expect, it } from 'vitest'
import type { WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import freeWindow from '.'

const MONDAY = 1
const range = (startsAt: string, endsAt: string): WeeklyAvailabilityRange => (
  { weekday: MONDAY, startsAt, endsAt }
)

describe('freeWindow', () => {
  it('spans the whole day when there are no neighboring ranges', () => {
    expect(freeWindow([], 600)).toEqual({ start: 0, end: 1440 })
  })

  it('is bounded below by a range that ends before the point', () => {
    const dayRanges = [range('08:00', '09:00')]

    expect(freeWindow(dayRanges, 600)).toEqual({ start: 540, end: 1440 })
  })

  it('is bounded above by a range that starts after the point', () => {
    const dayRanges = [range('11:00', '12:00')]

    expect(freeWindow(dayRanges, 600)).toEqual({ start: 0, end: 660 })
  })

  it('is bounded on both sides between two neighboring ranges', () => {
    const dayRanges = [range('08:00', '09:00'), range('11:00', '12:00')]

    expect(freeWindow(dayRanges, 600)).toEqual({ start: 540, end: 660 })
  })

  it('returns null for a point inside an existing range', () => {
    const dayRanges = [range('09:00', '13:00')]

    expect(freeWindow(dayRanges, 600)).toBeNull()
  })

  it('treats the last half hour as occupied through midnight', () => {
    const startsAt = '23:30'
    const endsAt = '24:00'
    const dayRanges = [range(startsAt, endsAt)]

    expect(freeWindow(dayRanges, 1425)).toBeNull()
    expect(freeWindow(dayRanges, 1380)).toEqual({ start: 0, end: 1410 })
  })

  it('returns null when the remaining gap is under 30 minutes', () => {
    const dayRanges = [range('08:00', '10:10'), range('10:20', '12:00')]

    expect(freeWindow(dayRanges, 615)).toBeNull()
  })
})
