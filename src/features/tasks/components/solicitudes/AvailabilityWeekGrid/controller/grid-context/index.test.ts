import { expect, it, vi } from 'vitest'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import gridContext from '.'

const RANGE: EditableRange = {
  clientId: 'monday',
  weekday: 1,
  startsAt: '09:00',
  endsAt: '10:00',
  note: null,
}

it('carries the props ranges, readOnly, and onChange, plus the given select and markCreated setters', () => {
  const [onChange, select, markCreated] = [vi.fn(), vi.fn(), vi.fn()]
  const props = {
    ranges: [RANGE],
    workday: null,
    readOnly: false,
    onChange,
  }
  const context = gridContext(props, select, markCreated)

  expect(context).toEqual({
    ranges: props.ranges,
    readOnly: false,
    onChange,
    select,
    markCreated,
  })
})
