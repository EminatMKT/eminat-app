import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { translate, type I18nKey } from '@/shared/i18n'
import { DIALOG } from '@/shared/constants/dom'
import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'
import { EDITOR_COPY }
  from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import MemberAvailabilityModal from './index'

type Vars = Parameters<typeof translate>[2]

const ENGLISH_LOCALE = 'en'
const english = (key: I18nKey, vars?: Vars) => translate(ENGLISH_LOCALE, key, vars)
const mocked = vi.hoisted(() => ({ i18n: '@/shared/i18n' }))

vi.mock(mocked.i18n, async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useT: () => ({ t: english }),
}))

const DIALOG_ROLE_MARKUP = `role="${DIALOG}"`
const MEMBER_NAME = 'Carla Soto'
const TEAM_NAME = 'Operaciones'

const viewerDefaults: AvailabilityMemberDto = {
  id: 'viewer-1',
  name: MEMBER_NAME,
  team: { id: 'ops-team', name: TEAM_NAME },
  workday: { id: 'half-day', name: 'Media jornada', hoursPerWeek: 20 },
  ranges: [],
  canEdit: false,
}

const viewer = (overrides: Partial<AvailabilityMemberDto>): AvailabilityMemberDto => ({
  ...viewerDefaults,
  ...overrides,
})

const noop = () => undefined

const draw = (value: AvailabilityMemberDto) =>
  renderToStaticMarkup(<MemberAvailabilityModal member={value} onClose={noop} onSaved={noop} />)

const textNode = (text: string) => `>${text}<`

const editableOverrides: Partial<AvailabilityMemberDto> = { canEdit: true }
const noJornadaOverrides: Partial<AvailabilityMemberDto> = { canEdit: true, workday: null }
const zeroHoursVars = { hours: EDITOR_COPY.zeroHours }

describe('MemberAvailabilityModal', () => {
  it('names the dialog after the member and shows their team as subtitle', () => {
    const html = draw(viewer({}))
    const expected = [textNode(MEMBER_NAME), textNode(TEAM_NAME), DIALOG_ROLE_MARKUP]

    for (const markup of expected) {
      expect(html).toContain(markup)
    }
  })

  it('renders the editor with its save/cancel bar for a member marked editable', () => {
    const html = draw(viewer(editableOverrides))
    const saveText = english(EDITOR_COPY.save)

    expect(html).toContain(saveText)
  })

  it('renders the same editor read-only, without save/cancel, for a non-editable member', () => {
    const html = draw(viewer({}))
    const saveText = english(EDITOR_COPY.save)
    const cancelText = english(EDITOR_COPY.cancel)
    const weeklyHoursText = english(EDITOR_COPY.weeklyHoursKey, zeroHoursVars)

    expect(html).not.toContain(saveText)
    expect(html).not.toContain(cancelText)
    expect(html).toContain(weeklyHoursText)
  })

  it('keeps an editable member without a jornada read-only, with the one notice instead', () => {
    const html = draw(viewer(noJornadaOverrides))
    const saveText = english(EDITOR_COPY.save)
    const noticeText = english(EDITOR_COPY.noJornadaAssigned)

    expect(html).not.toContain(saveText)
    expect(html).toContain(noticeText)
  })
})
