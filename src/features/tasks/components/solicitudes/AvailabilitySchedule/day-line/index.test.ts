import { describe, expect, it } from 'vitest'
import translate from '@/shared/i18n/translate'
import type { AvailabilityRangeDto } from '@/features/tasks/data/availability/types'
import {
  AVAILABILITY_DAYS,
} from '@/features/tasks/components/solicitudes/MemberAvailabilityCard/constants'
import buildDayLine from '.'

const t = (key: Parameters<typeof translate>[1], vars?: Parameters<typeof translate>[2]) =>
  translate('en', key, vars)

const monday = AVAILABILITY_DAYS[0]

const morningRange: AvailabilityRangeDto = {
  id: 'r1',
  weekday: 1,
  startsAt: '09:00',
  endsAt: '13:00',
  note: null,
}

const noteRange: AvailabilityRangeDto = {
  id: 'r2',
  weekday: 1,
  startsAt: '14:00',
  endsAt: '18:00',
  note: 'Not available for meetings',
}

describe('buildDayLine', () => {
  it('joins the day ranges and names a note in parentheses', () => {
    const ranges = [morningRange, noteRange]
    const line = buildDayLine({
      day: monday,
      ranges,
      hoursPerDay: 8,
      t,
    })

    expect(line.rangesText).toContain('09:00–13:00')
    expect(line.rangesText).toContain('14:00–18:00 (Not available for meetings)')
  })

  it('names an empty day instead of an empty string', () => {
    const line = buildDayLine({
      day: monday,
      ranges: [],
      hoursPerDay: 8,
      t,
    })

    expect(line.rangesText).toBe(t('tasks.availability.emptyDay'))
  })

  it('reports the status symbol and text for below, complete, and missing jornada', () => {
    const below = buildDayLine({
      day: monday,
      ranges: [morningRange],
      hoursPerDay: 8,
      t,
    })
    const complete = buildDayLine({
      day: monday,
      ranges: [morningRange],
      hoursPerDay: 4,
      t,
    })
    const missing = buildDayLine({
      day: monday,
      ranges: [morningRange],
      hoursPerDay: null,
      t,
    })

    expect(below.statusSymbol).toBe('↓')
    expect(complete.statusSymbol).toBe('✓')
    expect(missing.statusSymbol).toBe('—')
    expect(missing.statusText).toBe(t('tasks.availability.noWorkday'))
  })
})
