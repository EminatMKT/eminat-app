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

const PENCIL_ICON_CLASS = 'lucide-pencil'
const EYE_ICON_CLASS = 'lucide-eye'
const APOSTROPHE = "'"
const HTML_APOSTROPHE_ENTITY = '&#x27;'
const DECLARED_HOURS = 4
const DECLARED_WITHOUT_JORNADA_KEY: I18nKey = 'tasks.availability.declaredWithoutJornada'

const escapeApostrophe = (value: string) => value.replace(APOSTROPHE, HTML_APOSTROPHE_ENTITY)

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
  it('renders the compact summary: name, team, and the weekly hours badge', () => {
    const html = draw(member({}))
    const weekBelowKey: I18nKey = 'tasks.availability.weekBelow'
    const total = english(weekBelowKey, { declared: 4, expected: 56, difference: 52 })

    expect(html).toContain('Ana López')
    expect(html).toContain('Marketing')
    expect(html).toContain(total)
  })

  it('keeps the declared hours and adds the no-jornada notice when there is no workday', () => {
    const html = draw(member({ workday: null }))
    const declaredVars = { hours: DECLARED_HOURS }
    const notice = english(DECLARED_WITHOUT_JORNADA_KEY, declaredVars)

    expect(html).toContain(notice)
  })

  it('renders no per-day breakdown', () => {
    const html = draw(member({}))

    expect(html).not.toContain(english('tasks.availability.monday'))
    expect(html).not.toContain(english('tasks.availability.tuesday'))
    expect(html).not.toContain('09:00')
  })

  it('shows the pencil icon, decoratively, for the viewer\'s own editable card', () => {
    const html = draw(member({ canEdit: true }))

    expect(html).toContain(PENCIL_ICON_CLASS)
    expect(html).not.toContain(EYE_ICON_CLASS)
  })

  it('shows the eye icon, decoratively, for a read-only teammate card', () => {
    const html = draw(member({ canEdit: false }))

    expect(html).toContain(EYE_ICON_CLASS)
    expect(html).not.toContain(PENCIL_ICON_CLASS)
  })

  it('is one full-card clickable control, named for assistive technology', () => {
    const html = draw(member({}))
    const raw = english('tasks.availability.openSchedule', { name: 'Ana López' })
    const label = escapeApostrophe(raw)

    expect(html).toContain('type="button"')
    expect(html).toContain(`aria-label="${label}"`)
  })

  it('names the control as editable for the viewer\'s own card', () => {
    const html = draw(member({ canEdit: true }))
    const editScheduleKey: I18nKey = 'tasks.availability.editSchedule'
    const raw = english(editScheduleKey, { name: 'Ana López' })
    const label = escapeApostrophe(raw)

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
