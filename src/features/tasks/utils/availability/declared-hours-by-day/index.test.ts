import { describe, expect, it } from 'vitest'
import type { WeeklyAvailabilityRange } from '../types'
import declaredHoursByDay from '.'

describe('declaredHoursByDay', () => {
  it('adds multiple ranges on the same day and keeps other days separate', () => {
    const ranges: WeeklyAvailabilityRange[] = [
      { weekday: 1, startsAt: '09:00', endsAt: '13:00' },
      { weekday: 1, startsAt: '14:00', endsAt: '18:00' },
      { weekday: 2, startsAt: '11:00', endsAt: '15:00' },
    ]

    expect(declaredHoursByDay(ranges)).toEqual({ 1: 8, 2: 4 })
  })

  it('leaves a weekday with no ranges absent from the result', () => {
    const ranges: WeeklyAvailabilityRange[] = [{ weekday: 3, startsAt: '09:00', endsAt: '10:00' }]

    expect(declaredHoursByDay(ranges)).toEqual({ 3: 1 })
  })
})
