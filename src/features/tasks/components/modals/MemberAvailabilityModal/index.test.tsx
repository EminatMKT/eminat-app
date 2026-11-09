import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import translate from '@/shared/i18n/translate'
import type { I18nKey } from '@/shared/i18n'
import type { Vars } from '@/shared/i18n/types'
import type { AvailabilityMemberDto } from '@/features/tasks/data/availability/types'
import EDITOR_COPY from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import MemberAvailabilityModal from './index'

const english = (key: I18nKey, vars?: Vars) => translate('en', key, vars)

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: english }) }))

const viewerDefaults: AvailabilityMemberDto = {
  id: 'viewer-1',
  name: 'Carla Soto',
  team: { id: 'ops-team', name: 'Operaciones' },
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

const editableOverrides: Partial<AvailabilityMemberDto> = { canEdit: true }
const noJornadaOverrides: Partial<AvailabilityMemberDto> = { canEdit: true, workday: null }
const zeroHoursVars = { hours: EDITOR_COPY.zeroHours }

describe('MemberAvailabilityModal', () => {
  it('names the dialog after the member and shows their team as subtitle', () => {
    const html = draw(viewer({}))

    expect(html).toContain('>Carla Soto<')
    expect(html).toContain('>Operaciones<')
    expect(html).toContain('role="dialog"')
  })

  it('renders the editor with its save/cancel bar for a member marked editable', () => {
    const html = draw(viewer(editableOverrides))
    const saveText = english(EDITOR_COPY.save)

    expect(html).toContain(saveText)
  })

  it('renders the same editor read-only, with no save/cancel bar, for a non-editable member', () => {
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
