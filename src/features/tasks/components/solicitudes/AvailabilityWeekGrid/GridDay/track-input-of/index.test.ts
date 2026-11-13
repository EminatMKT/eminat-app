import { expect, it, vi } from 'vitest'
import { AVAILABILITY_DAYS } from '@/features/tasks/utils/availability'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types/types'
import trackInputOf from '.'

const RANGE: EditableRange = {
  clientId: 'monday',
  weekday: 1,
  startsAt: '09:00',
  endsAt: '10:00',
  note: null,
}
const OTHER_RANGE: EditableRange = { ...RANGE, clientId: 'tuesday', weekday: 2 }
const NOOP = () => undefined
const ZERO_TOP = () => 0
const BLANK_LABEL = ''

function buildProps() {
  const props = {
    day: AVAILABILITY_DAYS[0],
    ranges: [RANGE, OTHER_RANGE],
    workday: null,
    readOnly: false,
    onChange: NOOP,
    onOpen: NOOP,
    onCreate: vi.fn(),
    onAdd: NOOP,
  }

  return props
}

it("filters the week's ranges down to this day's own, carrying columnTop and t through", () => {
  const translate = () => BLANK_LABEL
  const input = trackInputOf(buildProps(), ZERO_TOP, translate)

  expect(input.dayRanges).toEqual([RANGE])
  expect(input.columnTop).toBe(ZERO_TOP)
  expect(input.t).toBe(translate)
})
