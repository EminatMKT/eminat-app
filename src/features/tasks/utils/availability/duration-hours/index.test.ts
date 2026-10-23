import { describe, expect, it } from 'vitest'
import durationHours from '.'

describe('durationHours', () => {
  it('calculates duration from canonical HH:mm values', () => {
    expect(durationHours({ weekday: 1, startsAt: '09:00', endsAt: '13:30' })).toBe(4.5)
  })

  it('reports zero for a malformed or reversed range', () => {
    expect(durationHours({ weekday: 1, startsAt: 'nine', endsAt: '13:00' })).toBe(0)
    expect(durationHours({ weekday: 1, startsAt: '10:00', endsAt: '09:00' })).toBe(0)
  })

  it('handles the midnight and end-of-day boundaries', () => {
    expect(durationHours({ weekday: 7, startsAt: '00:00', endsAt: '00:30' })).toBe(0.5)
    expect(durationHours({ weekday: 7, startsAt: '23:00', endsAt: '23:59' })).toBeCloseTo(59 / 60)
  })
})
