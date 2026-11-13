import { describe, expect, it } from 'vitest'
import type { WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import { DAY_END_MINUTE } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry'
import firstFreeWindow from '.'

const MONDAY = 1

const range = (startsAt: string, endsAt: string): WeeklyAvailabilityRange => ({
  weekday: MONDAY,
  startsAt,
  endsAt,
})

describe('firstFreeWindow', () => {
  it('returns the whole day when there are no ranges', () => {
    expect(firstFreeWindow([])).toEqual({ start: 0, end: DAY_END_MINUTE })
  })

  it('starts after a range that already occupies minute zero', () => {
    const result = firstFreeWindow([range('00:00', '09:00')])

    expect(result?.start).toBe(9 * 60)
  })

  it('skips past consecutive back-to-back ranges from midnight', () => {
    const result = firstFreeWindow([range('00:00', '01:00'), range('01:00', '02:00')])

    expect(result?.start).toBe(2 * 60)
  })

  it('returns null when the day is fully booked', () => {
    expect(firstFreeWindow([range('00:00', '23:59')])).toBeNull()
  })
})
