import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { translate, type I18nKey } from '@/shared/i18n'
import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'
import {
  EDIT_SCHEDULE_KEY,
  NO_JORNADA_KEY,
  OPEN_SCHEDULE_KEY,
  WEEK_STATUS_COPY_KEYS,
} from './constants'
import MemberAvailabilityCard from './index'

const ENGLISH_LOCALE = 'en'
const english = (key: I18nKey, vars?: Parameters<typeof translate>[2]) =>
  translate(ENGLISH_LOCALE, key, vars)
const mocked = vi.hoisted(() => ({ i18n: '@/shared/i18n' }))

vi.mock(mocked.i18n, async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useT: () => ({ t: english }),
}))

type Control = ReactElement<{ onClick: () => void }>

const APOSTROPHE = "'"
const HTML_APOSTROPHE_ENTITY = '&#x27;'
const DECLARED_HOURS = 4
const MEMBER_NAME = 'Ana López'
const TEAM_NAME = 'Marketing'
const BUTTON_TYPE_MARKUP = 'type="button"'
const MONDAY_KEY: I18nKey = 'tasks.availability.monday'
const TUESDAY_KEY: I18nKey = 'tasks.availability.tuesday'

const escapeApostrophe = (value: string) => value.replace(APOSTROPHE, HTML_APOSTROPHE_ENTITY)

const memberDefaults: AvailabilityMemberDto = {
  id: 'member-1',
  name: MEMBER_NAME,
  team: { id: 'team-1', name: TEAM_NAME },
  workday: { id: 'workday-1', name: 'Full time', hoursPerWeek: 40 },
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

const ariaLabelFor = (key: I18nKey) => {
  const nameVars = { name: MEMBER_NAME }

  return `aria-label="${escapeApostrophe(english(key, nameVars))}"`
}

describe('MemberAvailabilityCard', () => {
  it('compares the declared week against the jornada weekly hours as stored, unscaled', () => {
    const html = draw(member({}))
    const belowVars = { declared: 4, expected: 40, difference: 36 }
    const total = english(WEEK_STATUS_COPY_KEYS.below, belowVars)

    for (const text of [MEMBER_NAME, TEAM_NAME, total]) {
      expect(html).toContain(text)
    }
  })

  it('keeps the declared hours and adds the no-jornada notice when there is no workday', () => {
    const html = draw(member({ workday: null }))
    const declaredVars = { hours: DECLARED_HOURS }
    const notice = english(NO_JORNADA_KEY, declaredVars)

    expect(html).toContain(notice)
  })

  it('renders no per-day breakdown', () => {
    const html = draw(member({}))
    const [firstRange] = memberDefaults.ranges

    for (const text of [english(MONDAY_KEY), english(TUESDAY_KEY), firstRange.startsAt]) {
      expect(html).not.toContain(text)
    }
  })

  it('is one full-card clickable control, named for assistive technology', () => {
    const html = draw(member({}))

    expect(html).toContain(BUTTON_TYPE_MARKUP)
    expect(html).toContain(ariaLabelFor(OPEN_SCHEDULE_KEY))
  })

  it('names the control as editable for the viewer\'s own card', () => {
    const html = draw(member({ canEdit: true }))

    expect(html).toContain(ariaLabelFor(EDIT_SCHEDULE_KEY))
  })

  it('calls onOpen when pressed', () => {
    let opened = 0
    const onOpen = () => { opened += 1 }
    const control: Control = MemberAvailabilityCard({ member: member({}), onOpen })

    control.props.onClick()

    expect(opened).toBe(1)
  })
})
