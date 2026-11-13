import { expect, it, vi } from 'vitest'
import { AVAILABILITY_DAYS } from '@/features/tasks/utils/availability'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types/types'
import pointerCreate from '.'

const RANGE: EditableRange = {
  clientId: 'monday',
  weekday: 1,
  startsAt: '09:00',
  endsAt: '10:00',
  note: null,
}

function fixture() {
  const input = {
    ranges: [RANGE],
    readOnly: false,
    onChange: vi.fn(),
    select: vi.fn(),
    markCreated: vi.fn(),
  }

  return input
}

it('creates a click block without opening, and a drag block with selection by identity', () => {
  const input = fixture()
  const actions = pointerCreate(input)
  const bounds = { start: 600, end: 660 }

  actions.onCreate(AVAILABILITY_DAYS[0], bounds, false)
  expect(input.select).not.toHaveBeenCalled()
  expect(input.markCreated).not.toHaveBeenCalled()
  actions.onCreate(AVAILABILITY_DAYS[0], bounds, true)
  const created = input.onChange.mock.calls[1][0][1]

  expect(input.select).toHaveBeenCalledWith(created.clientId)
  expect(input.markCreated).toHaveBeenCalledWith(created.clientId)
})

it('rejects an overlapping create without touching onChange, select, or markCreated', () => {
  const input = fixture()
  const actions = pointerCreate(input)
  const bounds = { start: 570, end: 630 }

  actions.onCreate(AVAILABILITY_DAYS[0], bounds, true)
  const untouched = [input.onChange, input.select, input.markCreated]

  for (const callback of untouched) {
    expect(callback).not.toHaveBeenCalled()
  }
})

it('blocks every create while read-only', () => {
  const input = fixture()

  input.readOnly = true
  const actions = pointerCreate(input)

  actions.onCreate(AVAILABILITY_DAYS[0], { start: 600, end: 660 }, true)
  expect(input.onChange).not.toHaveBeenCalled()
})
