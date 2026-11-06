import { expect, it, vi } from 'vitest'
import { AVAILABILITY_DAYS } from '@/features/tasks/utils/availability'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import createConfig from '.'

const RANGE: EditableRange = {
  clientId: 'monday',
  weekday: 1,
  startsAt: '09:00',
  endsAt: '10:00',
  note: null,
}
const NOOP = () => undefined
const ZERO_TOP = () => 0

function buildProps() {
  const props = {
    day: AVAILABILITY_DAYS[0],
    ranges: [RANGE],
    workday: null,
    readOnly: false,
    onChange: NOOP,
    onOpen: NOOP,
    onCreate: vi.fn(),
    onAdd: NOOP,
  }

  return props
}

it("filters dayRanges to the config's own weekday and tracks live readOnly", () => {
  const props = buildProps()
  const config = createConfig(() => props, ZERO_TOP)

  expect(config.dayRanges).toEqual([RANGE])
  props.readOnly = true
  expect(config.readOnly).toBe(true)
})

it('commits a created range through the live onCreate, carrying openPopover as open', () => {
  const props = buildProps()
  const config = createConfig(() => props, ZERO_TOP)
  const bounds = { start: 600, end: 660 }

  config.onCommit({ bounds, openPopover: true })

  expect(props.onCreate).toHaveBeenCalledWith(props.day, bounds, true)
})
