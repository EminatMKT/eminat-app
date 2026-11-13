import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types/types'
import type { WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import type { PopoverProps } from './types'
import { SAMPLE_CLIENT_ID, SAMPLE_DAY_LABEL } from './constants'
import Popover from './index'

const { I18N_MODULE } = vi.hoisted(() => ({ I18N_MODULE: '@/shared/i18n' }))

vi.mock(I18N_MODULE, () => ({ useT: () => ({ t: (key: string) => key }) }))

const SAVE_LABEL_KEY = 'common.saveChanges'
const FIELD_ATTRS = [
  `id="${SAMPLE_CLIENT_ID}-start"`,
  `id="${SAMPLE_CLIENT_ID}-end"`,
  `id="${SAMPLE_CLIENT_ID}-note"`,
]

const RANGE: EditableRange = {
  clientId: SAMPLE_CLIENT_ID,
  weekday: 1,
  startsAt: '09:00',
  endsAt: '17:00',
  note: 'Focus work',
}
const RANGES: WeeklyAvailabilityRange[] = [RANGE]
const HANDLERS = { onSave: vi.fn(), onRemove: vi.fn(), onClose: vi.fn() }

const BASE_PROPS: PopoverProps = {
  range: RANGE,
  rangeIndex: 0,
  ranges: RANGES,
  dayLabel: SAMPLE_DAY_LABEL,
  readOnly: false,
  isNewlyCreated: false,
  ...HANDLERS,
}

const draw = (props: PopoverProps) => renderToStaticMarkup(createElement(Popover, props))

describe('Popover', () => {
  it('shows the three independently identified range fields', () => {
    const html = draw(BASE_PROPS)

    for (const attr of FIELD_ATTRS) {
      expect(html).toContain(attr)
    }
  })

  it('offers save while editable', () => {
    const html = draw(BASE_PROPS)

    expect(html).toContain(SAVE_LABEL_KEY)
  })

  it('hides save in view mode', () => {
    const html = draw({ ...BASE_PROPS, readOnly: true })

    expect(html).not.toContain(SAVE_LABEL_KEY)
  })
})
