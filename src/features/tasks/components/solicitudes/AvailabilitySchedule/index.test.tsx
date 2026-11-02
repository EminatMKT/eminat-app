import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import translate from '@/shared/i18n/translate'
import type { I18nKey } from '@/shared/i18n'
import type { Vars } from '@/shared/i18n/types'
import type {
  AvailabilityMemberDto,
  AvailabilityRangeDto,
} from '@/features/tasks/data/availability/types'
import AvailabilitySchedule from './index'

const english = (key: I18nKey, vars?: Vars) => translate('en', key, vars)

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: english }) }))

const mondayRange = (overrides: Partial<AvailabilityRangeDto>): AvailabilityRangeDto => ({
  id: 'range-monday',
  weekday: 1,
  startsAt: '09:00',
  endsAt: '13:00',
  note: null,
  ...overrides,
})

const afternoonOverrides: Partial<AvailabilityRangeDto> = {
  id: 'afternoon',
  startsAt: '14:00',
  endsAt: '18:00',
  note: 'Not available for meetings',
}
const morningOverrides: Partial<AvailabilityRangeDto> = { id: 'morning' }
const belowRangeOverrides: Partial<AvailabilityRangeDto> = { endsAt: '15:00' }
const aboveRangeOverrides: Partial<AvailabilityRangeDto> = { endsAt: '18:00' }

const scheduleOwner: AvailabilityMemberDto = {
  id: 'schedule-owner',
  name: 'Beto Ramírez',
  team: { id: 'sales-team', name: 'Ventas' },
  workday: { id: 'full-day', name: 'Jornada completa', hoursPerDay: 8 },
  ranges: [
    mondayRange(afternoonOverrides),
    mondayRange(morningOverrides),
  ],
  canEdit: false,
}

const owner = (overrides: Partial<AvailabilityMemberDto>): AvailabilityMemberDto => ({
  ...scheduleOwner,
  ...overrides,
})

const draw = (value: AvailabilityMemberDto) =>
  renderToStaticMarkup(<AvailabilitySchedule member={value} />)

const dayCompleteVars = { declared: 8, expected: 8 }
const weekDeclaredVars = { hours: 8 }
const dayBelowVars = { declared: 6, expected: 8, difference: 2 }
const dayAboveVars = { declared: 9, expected: 8, difference: 1 }
const noOverrides: Partial<AvailabilityMemberDto> = {}
const noRangesOverrides: Partial<AvailabilityMemberDto> = { ranges: [] }
const noWorkdayOverrides: Partial<AvailabilityMemberDto> = { workday: null }
const belowOwner: Partial<AvailabilityMemberDto> = { ranges: [mondayRange(belowRangeOverrides)] }
const aboveOwner: Partial<AvailabilityMemberDto> = { ranges: [mondayRange(aboveRangeOverrides)] }

describe('AvailabilitySchedule', () => {
  it('renders ordered ranges, notes, daily comparison, and the weekly total', () => {
    const html = draw(owner(noOverrides))

    expect(html.indexOf('09:00–13:00')).toBeLessThan(html.indexOf('14:00–18:00'))
    expect(html).toContain('Not available for meetings')
    expect(html).toContain(english('tasks.availability.dayComplete', dayCompleteVars))
    expect(html).toContain(english('tasks.availability.weekDeclared', weekDeclaredVars))
  })

  it('distinguishes an empty day from a member with no schedule', () => {
    const emptyDay = draw(owner(noOverrides))
    const noSchedule = draw(owner(noRangesOverrides))

    expect(emptyDay).toContain(english('tasks.availability.tuesday'))
    expect(emptyDay).toContain(english('tasks.availability.emptyDay'))
    expect(noSchedule).toContain(english('tasks.availability.notConfigured'))
  })

  it('shows unavailable comparison when the jornada is missing', () => {
    const html = draw(owner(noWorkdayOverrides))

    expect(html).toContain(english('tasks.availability.noWorkday'))
  })

  it('uses text and symbols for below, complete and above statuses', () => {
    const below = draw(owner(belowOwner))
    const above = draw(owner(aboveOwner))

    expect(below).toContain('↓')
    expect(below).toContain(english('tasks.availability.dayBelow', dayBelowVars))
    expect(above).toContain('↑')
    expect(above).toContain(english('tasks.availability.dayAbove', dayAboveVars))
    expect(draw(owner(noOverrides))).toContain('✓')
  })
})
