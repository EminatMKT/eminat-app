import { describe, expect, it } from 'vitest'
import type { WeeklyAvailabilityRange } from '../types'
import declaredWeeklyHours from '.'

describe('declaredWeeklyHours', () => {
  it('reports the weekly declared total across every day', () => {
    const ranges: WeeklyAvailabilityRange[] = [
      { weekday: 1, startsAt: '09:00', endsAt: '13:00' },
      { weekday: 1, startsAt: '14:00', endsAt: '18:00' },
      { weekday: 2, startsAt: '11:00', endsAt: '15:00' },
    ]

    expect(declaredWeeklyHours(ranges)).toBe(12)
  })

  it('reports zero for an empty week', () => {
    expect(declaredWeeklyHours([])).toBe(0)
  })
})
