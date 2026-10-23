import { describe, expect, it } from 'vitest'
import type { WeeklyAvailabilityRange } from './types'
import sortRanges from './sort-ranges'

describe('sortRanges', () => {
  it('sorts by weekday and start time without mutating the input', () => {
    const ranges: WeeklyAvailabilityRange[] = [
      { weekday: 2, startsAt: '14:00', endsAt: '18:00' },
      { weekday: 1, startsAt: '09:00', endsAt: '13:00' },
    ]
    const [original] = ranges
    expect(sortRanges(ranges).map(item => item.weekday)).toEqual([1, 2])
    expect(original?.weekday).toBe(2)
  })

  it('orders two ranges on the same weekday by start time', () => {
    const ranges: WeeklyAvailabilityRange[] = [
      { weekday: 1, startsAt: '14:00', endsAt: '18:00' },
      { weekday: 1, startsAt: '09:00', endsAt: '13:00' },
    ]
    expect(sortRanges(ranges).map(item => item.startsAt)).toEqual(['09:00', '14:00'])
  })

  it('sorts Sunday (weekday 7) after the earlier weekdays', () => {
    const sundayFirst: WeeklyAvailabilityRange[] = [
      { weekday: 7, startsAt: '10:00', endsAt: '12:00' },
      { weekday: 3, startsAt: '08:00', endsAt: '09:00' },
    ]
    expect(sortRanges(sundayFirst).map(item => item.weekday)).toEqual([3, 7])
  })
})
