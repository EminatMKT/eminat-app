import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'
import WeeklyAvailabilityEditor from './index'

const DAY_NAMES: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

vi.mock('@/shared/i18n', () => ({
  useT: () => ({
    t: (key: string, vars?: Record<string, string | number>) => {
      const dayKey = key.split('.').at(-1) ?? key
      if (DAY_NAMES[dayKey]) return DAY_NAMES[dayKey]
      if (key.endsWith('addRange')) return `Add ${vars?.day ?? ''} range`
      if (key.endsWith('removeRange')) {
        return `Remove ${vars?.day ?? ''} range ${vars?.number ?? ''}`
      }
      if (key.endsWith('dayBelow') || key.endsWith('dayComplete') || key.endsWith('dayAbove')) {
        return `${vars?.declared ?? ''} of ${vars?.expected ?? ''} hours`
      }
      if (key.endsWith('weekDeclared')) return `${vars?.hours ?? ''} hours declared`
      return key
    },
  }),
}))

vi.mock('@/features/tasks/data/availability/save-own', () => ({
  default: vi.fn(),
}))

const member: AvailabilityMemberDto = {
  id: 'member-1',
  name: 'Ana López',
  team: null,
  workday: {
    id: 'workday-1',
    name: 'Full time',
    hoursPerDay: 8,
  },
  ranges: [
    {
      id: 'monday-1',
      weekday: 1,
      startsAt: '09:00',
      endsAt: '13:00',
      note: null,
    },
  ],
  canEdit: true,
}

const draw = (value: AvailabilityMemberDto = member) => renderToStaticMarkup(
  <WeeklyAvailabilityEditor
    member={value}
    onCancel={vi.fn()}
    onSaved={vi.fn()}
  />,
)

const LABEL_ATTRIBUTE = 'aria-label'
const GLOBAL_FLAG = 'g'
const MONDAY_CONTROL_LABELS = ['Monday start time', 'Monday end time', 'Monday note']

/** Values of every label attribute in the markup (no DOM env is installed). */
const ariaLabels = (markup: string) => Array.from(
  markup.matchAll(new RegExp(`${LABEL_ATTRIBUTE}="([^"]*)"`, GLOBAL_FLAG)),
  (found) => found[1],
)

describe('WeeklyAvailabilityEditor', () => {
  it('renders seven labeled day sections and stable native controls', () => {
    const html = draw()

    expect(html).toContain('Monday')
    expect(html).toContain('Sunday')
    expect(ariaLabels(html)).toEqual(expect.arrayContaining(MONDAY_CONTROL_LABELS))
    expect(html).toContain('Add Monday range')
    expect(html).toContain('Remove Monday range 1')
    expect(html).toContain('Save availability')
  })

  it('shows a daily mismatch as visible text without disabling Save', () => {
    const mismatchMember: AvailabilityMemberDto = {
      ...member,
      ranges: [
        {
          ...member.ranges[0],
          endsAt: '15:00',
        },
      ],
    }
    const html = draw(mismatchMember)

    expect(html).toContain('6 of 8 hours')
    expect(html).not.toContain('disabled=""')
  })

  it('keeps saved information scoped to ranges rather than a user id', () => {
    const html = draw()

    expect(html).not.toContain('member-1')
    expect(html).toContain('09:00')
  })
})
