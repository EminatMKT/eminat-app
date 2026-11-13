import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'
import { NO_JORNADA_KEY } from '../constants'
import DeclaredTotal from './index'

const mocked = vi.hoisted(() => ({ i18n: '@/shared/i18n' }))

vi.mock(mocked.i18n, () => ({
  useT: () => ({ t: (key: string, vars: { hours: number }) => `${key}=${vars.hours}` }),
}))

const memberWithoutJornada: AvailabilityMemberDto = {
  id: 'member-5',
  name: 'Pablo Ríos',
  team: null,
  workday: null,
  ranges: [
    {
      id: 'r5',
      weekday: 3,
      startsAt: '08:00',
      endsAt: '11:30',
      note: null,
    },
  ],
  canEdit: false,
}

describe('DeclaredTotal', () => {
  it('shows the declared week total with the no-jornada notice', () => {
    const html = renderToStaticMarkup(<DeclaredTotal member={memberWithoutJornada} />)
    const declaredHours = 3.5

    expect(html).toContain(`${NO_JORNADA_KEY}=${declaredHours}`)
  })
})
