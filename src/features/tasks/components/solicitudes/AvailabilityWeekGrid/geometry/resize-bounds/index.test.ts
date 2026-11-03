import { describe, expect, it } from 'vitest'
import type { WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import resizeBounds from '.'

const MONDAY = 1
const range = (startsAt: string, endsAt: string): WeeklyAvailabilityRange => (
  { weekday: MONDAY, startsAt, endsAt }
)
const CURRENT = { start: 600, end: 660 }

describe('resizeBounds', () => {
  it('spans the whole day when there are no other ranges', () => {
    expect(resizeBounds([], CURRENT)).toEqual({ start: 0, end: 1440 })
  })

  it('is clamped by a range entirely before the current one', () => {
    const otherRanges = [range('08:00', '09:00')]

    expect(resizeBounds(otherRanges, CURRENT)).toEqual({ start: 540, end: 1440 })
  })

  it('is clamped by a range entirely after the current one', () => {
    const otherRanges = [range('12:00', '13:00')]

    expect(resizeBounds(otherRanges, CURRENT)).toEqual({ start: 0, end: 720 })
  })

  it('is clamped on both sides between two neighboring ranges', () => {
    const otherRanges = [range('08:00', '09:00'), range('12:00', '13:00')]

    expect(resizeBounds(otherRanges, CURRENT)).toEqual({ start: 540, end: 720 })
  })
})
