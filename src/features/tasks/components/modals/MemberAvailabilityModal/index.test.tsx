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
import MemberAvailabilityModal from './index'

const english = (key: I18nKey, vars?: Vars) => translate('en', key, vars)

vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: english }) }))

const viewerDefaults: AvailabilityMemberDto = {
  id: 'viewer-1',
  name: 'Carla Soto',
  team: { id: 'ops-team', name: 'Operaciones' },
  workday: { id: 'half-day', name: 'Media jornada', hoursPerDay: 4 },
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

describe('MemberAvailabilityModal', () => {
  it('names the dialog after the member and shows their team as subtitle', () => {
    const html = draw(viewer({}))

    expect(html).toContain('>Carla Soto<')
    expect(html).toContain('>Operaciones<')
    expect(html).toContain('role="dialog"')
  })

  it('renders the editor for the member marked editable', () => {
    const html = draw(viewer(editableOverrides))

    expect(html).toContain(english('tasks.availability.save'))
  })

  it('renders the read-only schedule for a non-editable member, with no editor controls', () => {
    const html = draw(viewer({}))

    expect(html).toContain(english('tasks.availability.notConfigured'))
    expect(html).not.toContain(english('tasks.availability.save'))
  })
})
