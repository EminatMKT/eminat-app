import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import translate from '@/shared/i18n/translate'
import type { I18nKey } from '@/shared/i18n'
import type { Vars } from '@/shared/i18n/types'
import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'
import MemberAvailabilityCard from './index'

const english = (key: I18nKey, vars?: Vars) => translate('en', key, vars)

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: english }) }))

type Control = ReactElement<{ onClick: () => void }>

const memberDefaults: AvailabilityMemberDto = {
  id: 'member-1',
  name: 'Ana López',
  team: { id: 'team-1', name: 'Marketing' },
  workday: { id: 'workday-1', name: 'Full time', hoursPerDay: 8 },
  ranges: [
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

const noop = () => undefined

const draw = (value: AvailabilityMemberDto, onOpen: () => void = noop) =>
  renderToStaticMarkup(<MemberAvailabilityCard member={value} onOpen={onOpen} />)

describe('MemberAvailabilityCard', () => {
  it('renders the compact summary: name, team, and the weekly declared total', () => {
    const html = draw(member({}))
    const total = english('tasks.availability.weekDeclared', { hours: 4 })

    expect(html).toContain('Ana López')
    expect(html).toContain('Marketing')
    expect(html).toContain(total)
  })

  it('shows "not configured" when the member has no ranges', () => {
    const html = draw(member({ ranges: [] }))

    expect(html).toContain(english('tasks.availability.notConfigured'))
  })

  it('renders no per-day breakdown', () => {
    const html = draw(member({}))

    expect(html).not.toContain(english('tasks.availability.monday'))
    expect(html).not.toContain(english('tasks.availability.tuesday'))
    expect(html).not.toContain('09:00')
  })

  it('is one full-card clickable control, named for assistive technology', () => {
    const html = draw(member({}))
    const raw = english('tasks.availability.openSchedule', { name: 'Ana López' })
    const label = raw.replace("'", '&#x27;')

    expect(html).toContain('type="button"')
    expect(html).toContain(`aria-label="${label}"`)
  })

  it('calls onOpen when pressed', () => {
    let opened = 0
    const onOpen = () => { opened += 1 }
    const control: Control = MemberAvailabilityCard({ member: member({}), onOpen })

    control.props.onClick()

    expect(opened).toBe(1)
  })
})
