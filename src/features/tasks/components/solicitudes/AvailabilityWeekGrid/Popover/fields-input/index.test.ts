import { describe, it, expect } from 'vitest'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import type { PopoverControllerResult } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/controller/types'
import type { PopoverProps } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Popover/types'
import buildFieldsInput from './index'

const DAY_LABEL = 'Monday'
const noop = () => undefined
const changeField = () => undefined
const RANGE: EditableRange = {
  clientId: 'range-1',
  weekday: 1,
  startsAt: '09:00',
  endsAt: '17:00',
  note: 'Focus work',
}
const PROPS: PopoverProps = {
  range: RANGE,
  rangeIndex: 0,
  ranges: [RANGE],
  dayLabel: DAY_LABEL,
  readOnly: false,
  isNewlyCreated: false,
  onSave: noop,
  onRemove: noop,
  onClose: noop,
}
const CONTROLLER: PopoverControllerResult = {
  draft: { startsAt: '09:00', endsAt: '17:00', note: 'Focus work' },
  error: undefined,
  canSave: true,
  changeField,
  save: noop,
  remove: noop,
}
const EXPECTED = {
  range: RANGE,
  draft: CONTROLLER.draft,
  error: undefined,
  dayLabel: DAY_LABEL,
  readOnly: false,
  changeField,
}

describe('buildFieldsInput', () => {
  it('combines props and controller into the shape buildPopoverFields needs', () => {
    expect(buildFieldsInput(PROPS, CONTROLLER)).toEqual(EXPECTED)
  })
})
