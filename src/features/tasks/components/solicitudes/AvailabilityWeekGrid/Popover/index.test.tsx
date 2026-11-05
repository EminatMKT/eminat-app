import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import type { WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import type { PopoverProps } from './types'
import Popover from './index'

const { I18N_MODULE } = vi.hoisted(() => ({ I18N_MODULE: '@/shared/i18n' }))

vi.mock(I18N_MODULE, () => ({ useT: () => ({ t: (key: string) => key }) }))

const CLIENT_ID = 'range-client-1'
const DAY_LABEL = 'Monday'
const SAVE_LABEL_KEY = 'common.saveChanges'
const START_FIELD_ATTR = `id="${CLIENT_ID}-start"`
const END_FIELD_ATTR = `id="${CLIENT_ID}-end"`
const NOTE_FIELD_ATTR = `id="${CLIENT_ID}-note"`

const RANGE: EditableRange = {
  clientId: CLIENT_ID,
  weekday: 1,
  startsAt: '09:00',
  endsAt: '17:00',
  note: 'Focus work',
}
const RANGES: WeeklyAvailabilityRange[] = [RANGE]
const onSave = vi.fn()
const onRemove = vi.fn()
const onClose = vi.fn()

const BASE_PROPS: PopoverProps = {
  range: RANGE,
  rangeIndex: 0,
  ranges: RANGES,
  dayLabel: DAY_LABEL,
  readOnly: false,
  onSave,
  onRemove,
  onClose,
}

const draw = (props: PopoverProps) => renderToStaticMarkup(createElement(Popover, props))

describe('Popover', () => {
  it('shows the three independently identified range fields', () => {
    const html = draw(BASE_PROPS)

    expect(html).toContain(START_FIELD_ATTR)
    expect(html).toContain(END_FIELD_ATTR)
    expect(html).toContain(NOTE_FIELD_ATTR)
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
