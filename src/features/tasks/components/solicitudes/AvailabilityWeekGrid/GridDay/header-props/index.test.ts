import { expect, it, vi } from 'vitest'
import { AVAILABILITY_DAYS } from '@/features/tasks/utils/availability'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import headerProps from '.'

const RANGE: EditableRange = {
  clientId: 'monday',
  weekday: 1,
  startsAt: '09:00',
  endsAt: '10:00',
  note: null,
}
const NOOP = () => undefined
const ZERO_TOP = () => 0
const HOURS_PER_DAY = 8
const SLOT = { startsAt: '10:00', endsAt: '11:00' }

function buildProps() {
  const props = {
    day: AVAILABILITY_DAYS[0],
    ranges: [RANGE],
    workday: { id: 'w1', name: 'Standard', hoursPerDay: HOURS_PER_DAY },
    readOnly: false,
    onChange: NOOP,
    onOpen: NOOP,
    onCreate: NOOP,
    onAdd: vi.fn(),
  }

  return props
}

it('carries day, ranges, expectedHours, and readOnly from the given props and track input', () => {
  const props = buildProps()
  const fields = headerProps(props, { dayRanges: [RANGE], columnTop: ZERO_TOP, t: () => '' })

  expect(fields.day).toBe(props.day)
  expect(fields.ranges).toEqual([RANGE])
  expect(fields.expectedHours).toBe(HOURS_PER_DAY)
  expect(fields.readOnly).toBe(false)
})

it("adapts onAdd into AddRangeControl's single-argument shape, carrying this day along", () => {
  const props = buildProps()
  const fields = headerProps(props, { dayRanges: [RANGE], columnTop: ZERO_TOP, t: () => '' })

  fields.onAdd(SLOT)

  expect(props.onAdd).toHaveBeenCalledWith(props.day, SLOT)
})
