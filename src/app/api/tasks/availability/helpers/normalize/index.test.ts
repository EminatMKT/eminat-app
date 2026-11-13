import { describe, expect, it } from 'vitest'
import { MISSING_WEEKDAY_MESSAGE } from '@/app/api/tasks/availability/constants'
import normalizeRange from '.'

describe('normalizeRange', () => {
  it('passes a valid range through unchanged', () => {
    const validRange = {
      weekday: 3 as const,
      startsAt: '09:00',
      endsAt: '10:00',
      note: null,
    }

    expect(normalizeRange(validRange)).toEqual(validRange)
  })

  it('throws when the zod-inferred weekday is missing, the real shape it guards against', () => {
    const rangeMissingWeekday: Parameters<typeof normalizeRange>[0] = {
      startsAt: '09:00',
      endsAt: '10:00',
      note: null,
    }

    expect(() => normalizeRange(rangeMissingWeekday)).toThrow(MISSING_WEEKDAY_MESSAGE)
  })
})
