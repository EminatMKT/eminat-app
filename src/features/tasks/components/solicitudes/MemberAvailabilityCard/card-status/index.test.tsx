import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'
import CardStatus from './index'

const WEEK_HOURS_MARKER = 'week-hours-marker'
const DECLARED_TOTAL_MARKER = 'declared-total-marker'
const PENCIL_ICON_CLASS = 'lucide-pencil'
const EYE_ICON_CLASS = 'lucide-eye'
const DECORATIVE_MARKUP = 'aria-hidden="true"'
const mocked = vi.hoisted(() => ({
  weekHours: '../week-hours',
  declaredTotal: '../declared-total',
}))

vi.mock(mocked.weekHours, () => ({ default: () => WEEK_HOURS_MARKER }))
vi.mock(mocked.declaredTotal, () => ({ default: () => DECLARED_TOTAL_MARKER }))

const readOnlyMember: AvailabilityMemberDto = {
  id: 'member-9',
  name: 'Sofía Ruiz',
  team: { id: 'design', name: 'Diseño' },
  workday: { id: 'full', name: 'Full', hoursPerWeek: 40 },
  ranges: [],
  canEdit: false,
}

describe('CardStatus', () => {
  it('shows the week badge next to the eye icon for a read-only teammate', () => {
    const html = renderToStaticMarkup(<CardStatus member={readOnlyMember} />)

    expect(html).toContain(WEEK_HOURS_MARKER)
    expect(html).toContain(EYE_ICON_CLASS)
    expect(html).not.toContain(PENCIL_ICON_CLASS)
  })

  it('shows the bare declared total instead of the badge when there is no jornada', () => {
    const noJornadaMember: AvailabilityMemberDto = { ...readOnlyMember, workday: null }
    const html = renderToStaticMarkup(<CardStatus member={noJornadaMember} />)

    expect(html).toContain(DECLARED_TOTAL_MARKER)
    expect(html).not.toContain(WEEK_HOURS_MARKER)
  })

  it('shows the pencil icon, decoratively, for the viewer\'s own editable card', () => {
    const editableMember: AvailabilityMemberDto = { ...readOnlyMember, canEdit: true }
    const html = renderToStaticMarkup(<CardStatus member={editableMember} />)

    expect(html).toContain(PENCIL_ICON_CLASS)
    expect(html).toContain(DECORATIVE_MARKUP)
    expect(html).not.toContain(EYE_ICON_CLASS)
  })
})
