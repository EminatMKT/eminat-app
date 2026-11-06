import { expect, it, vi } from 'vitest'
import { AVAILABILITY_DAYS } from '@/features/tasks/utils/availability'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import dayPropsOf from '.'

const RANGE: EditableRange = {
  clientId: 'monday',
  weekday: 1,
  startsAt: '09:00',
  endsAt: '10:00',
  note: null,
}

function buildProps() {
  const props = {
    ranges: [RANGE],
    workday: null,
    readOnly: false,
    onChange: vi.fn(),
  }

  return props
}

function buildActions() {
  const actions = {
    onOpen: vi.fn(),
    onCreate: vi.fn(),
    onAdd: vi.fn(),
    onSave: vi.fn(),
    onRemove: vi.fn(),
    onClose: vi.fn(),
  }

  return actions
}

it('builds one day entry per declared weekday, sharing the grid props and handlers', () => {
  const props = buildProps()
  const actions = buildActions()
  const days = dayPropsOf(props, actions)

  expect(days).toHaveLength(AVAILABILITY_DAYS.length)
  expect(days.map(day => day.day)).toEqual(AVAILABILITY_DAYS)
  expect(days[0]).toMatchObject({ ranges: props.ranges, onOpen: actions.onOpen })
})
