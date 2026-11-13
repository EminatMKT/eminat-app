import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'
import { EDIT_SCHEDULE_KEY, OPEN_SCHEDULE_KEY } from '../constants'
import useScheduleLabel from '.'

const mocked = vi.hoisted(() => ({ i18n: '@/shared/i18n' }))

vi.mock(mocked.i18n, () => ({
  useT: () => ({ t: (key: string, vars: { name: string }) => `${key}|${vars.name}` }),
}))

const teammate: AvailabilityMemberDto = {
  id: 'member-3',
  name: 'Marta Gil',
  team: null,
  workday: null,
  ranges: [],
  canEdit: false,
}

describe('useScheduleLabel', () => {
  it('names a read-only card as opening that member\'s schedule', () => {
    expect(useScheduleLabel(teammate)).toBe(`${OPEN_SCHEDULE_KEY}|${teammate.name}`)
  })

  it('names the viewer\'s own card as editing their schedule', () => {
    const ownMember: AvailabilityMemberDto = { ...teammate, canEdit: true }

    expect(useScheduleLabel(ownMember)).toBe(`${EDIT_SCHEDULE_KEY}|${ownMember.name}`)
  })
})
