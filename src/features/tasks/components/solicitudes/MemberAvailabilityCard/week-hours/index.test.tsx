import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { translate, type I18nKey } from '@/shared/i18n'
import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'
import { WEEK_STATUS_COPY_KEYS } from '../constants'
import WeekHours from './index'

type Vars = Parameters<typeof translate>[2]

const ENGLISH_LOCALE = 'en'
const english = (key: I18nKey, vars?: Vars) => translate(ENGLISH_LOCALE, key, vars)
const mocked = vi.hoisted(() => ({ i18n: '@/shared/i18n' }))

vi.mock(mocked.i18n, async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useT: () => ({ t: english }),
}))

const partTimeMember: AvailabilityMemberDto = {
  id: 'member-7',
  name: 'Luis Pérez',
  team: null,
  workday: { id: 'part-time', name: 'Part time', hoursPerWeek: 20 },
  ranges: [
    {
      id: 'r7',
      weekday: 2,
      startsAt: '10:00',
      endsAt: '15:00',
      note: null,
    },
  ],
  canEdit: true,
}

describe('WeekHours', () => {
  it('compares the declared week against the jornada weekly hours', () => {
    const html = renderToStaticMarkup(<WeekHours member={partTimeMember} />)
    const belowVars = { declared: 5, expected: 20, difference: 15 }

    expect(html).toContain(english(WEEK_STATUS_COPY_KEYS.below, belowVars))
  })

  it('reports a complete week once the declared hours reach the jornada', () => {
    const fullWeekMember: AvailabilityMemberDto = {
      ...partTimeMember,
      workday: { id: 'short', name: 'Short', hoursPerWeek: 5 },
    }
    const html = renderToStaticMarkup(<WeekHours member={fullWeekMember} />)
    const completeVars = { declared: 5, expected: 5, difference: 0 }

    expect(html).toContain(english(WEEK_STATUS_COPY_KEYS.complete, completeVars))
  })
})
