import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'
import MemberAvailabilityCard from './index'

vi.mock('@/shared/i18n', () => ({
  useT: () => ({
    t: (key: string, vars?: Record<string, string | number>) => {
      const values: Record<string, string> = {
        'common.edit': 'Edit',
        'tasks.availability.monday': 'Monday',
        'tasks.availability.tuesday': 'Tuesday',
        'tasks.availability.wednesday': 'Wednesday',
        'tasks.availability.thursday': 'Thursday',
        'tasks.availability.friday': 'Friday',
        'tasks.availability.saturday': 'Saturday',
        'tasks.availability.sunday': 'Sunday',
        'tasks.availability.notConfigured': 'No schedule configured.',
        'tasks.availability.weekDeclared': `${vars?.hours ?? ''} hours declared`,
        'tasks.availability.dayLabel': `${vars?.day ?? ''}`,
        'tasks.availability.emptyDay': 'No availability declared.',
        'tasks.availability.dayBelow': `${vars?.declared ?? ''} of ${vars?.expected ?? ''} hours`,
        'tasks.availability.dayComplete': `${vars?.declared ?? ''} of ${vars?.expected ?? ''} hours`,
        'tasks.availability.dayAbove': `${vars?.declared ?? ''} of ${vars?.expected ?? ''} hours`,
        'tasks.availability.noWorkday': 'No workday configured',
      }
      return values[key] ?? key
    },
  }),
}))

const memberDefaults: AvailabilityMemberDto = {
  id: 'member-1',
  name: 'Ana López',
  team: { id: 'team-1', name: 'Marketing' },
  workday: { id: 'workday-1', name: 'Full time', hoursPerDay: 8 },
  ranges: [
    {
      id: 'r2',
      weekday: 1,
      startsAt: '14:00',
      endsAt: '18:00',
      note: 'Not available for meetings',
    },
    {
      id: 'r1',
      weekday: 1,
      startsAt: '09:00',
      endsAt: '13:00',
      note: null,
    },
  ],
  canEdit: false,
}

const member = (overrides: Partial<AvailabilityMemberDto>): AvailabilityMemberDto => ({
  ...memberDefaults,
  ...overrides,
})

const draw = (value: AvailabilityMemberDto, onEdit?: () => void) =>
  renderToStaticMarkup(<MemberAvailabilityCard member={value} onEdit={onEdit} />)

describe('MemberAvailabilityCard', () => {
  it('renders ordered ranges, notes, daily comparison, weekly total and team', () => {
    const html = draw(member({}))
    expect(html.indexOf('09:00–13:00')).toBeLessThan(html.indexOf('14:00–18:00'))
    expect(html).toContain('Not available for meetings')
    expect(html).toContain('8 of 8 hours')
    expect(html).toContain('8 hours declared')
    expect(html).toContain('Marketing')
    expect(html).toContain('14:00–18:00')
    expect(html).toContain('Not available for meetings')
  })

  it('distinguishes an empty day from a member with no schedule', () => {
    const emptyDay = draw(member({}))
    const noSchedule = draw(member({ ranges: [] }))
    expect(emptyDay).toContain('Tuesday')
    expect(emptyDay).not.toContain('warning')
    expect(noSchedule).toContain('No schedule configured.')
  })

  it('shows unavailable comparison when the jornada is missing', () => {
    const html = draw(member({ workday: null }))
    expect(html).toContain('No workday configured')
  })

  it('uses text and symbols for below, complete and above statuses', () => {
    const below = draw(member({
      ranges: [{
        id: 'r1',
        weekday: 1,
        startsAt: '09:00',
        endsAt: '15:00',
        note: null,
      }],
    }))
    const above = draw(member({
      ranges: [{
        id: 'r1',
        weekday: 1,
        startsAt: '09:00',
        endsAt: '18:00',
        note: null,
      }],
    }))
    expect(below).toContain('↓')
    expect(below).toContain('6 of 8 hours')
    expect(above).toContain('↑')
    expect(above).toContain('9 of 8 hours')
    expect(draw(member({}))).toContain('✓')
  })

  it('only offers editing for the member marked editable', () => {
    const onEdit = vi.fn()
    expect(draw(member({}), onEdit)).not.toContain('Edit')
    expect(draw(member({ canEdit: true }), onEdit)).toContain('Edit')
  })
})
