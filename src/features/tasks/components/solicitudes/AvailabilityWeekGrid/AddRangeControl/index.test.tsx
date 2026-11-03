import { renderToStaticMarkup } from 'react-dom/server'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { AvailabilityDay, WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import AddRangeControl from '.'

function mockTranslate(key: string, vars?: Record<string, unknown>): string {
  if (!vars) return key

  const entries = Object.entries(vars).map(([name, value]) => `${name}=${value}`)

  return `${key}:${entries.join(',')}`
}

vi.mock('@/shared/i18n', () => ({
  useT: () => ({ t: mockTranslate }),
}))

const MONDAY = 1
const NOOP = () => undefined
const day: AvailabilityDay = { weekday: MONDAY, labelKey: 'tasks.availability.monday' }

const range = (startsAt: string, endsAt: string): WeeklyAvailabilityRange => ({
  weekday: MONDAY,
  startsAt,
  endsAt,
})

const draw = (ranges: WeeklyAvailabilityRange[]) =>
  renderToStaticMarkup(<AddRangeControl day={day} ranges={ranges} onAdd={NOOP} />)

describe('AddRangeControl', () => {
  it('names the day in its label', () => {
    const html = draw([])

    expect(html).toContain('tasks.availability.addRange:day=tasks.availability.monday')
  })

  it('stays enabled when the day still has room', () => {
    const html = draw([])

    expect(html).not.toContain('disabled=')
  })

  it('disables itself with an explanation once the day is fully booked', () => {
    const html = draw([range('00:00', '23:59')])

    expect(html).toContain('disabled=""')
    expect(html).toContain('tasks.availability.dayFullyBooked')
  })
})
