import { expect, it, vi } from 'vitest'
import { AVAILABILITY_DAYS } from '@/features/tasks/utils/availability'
import { ENTER, TAB } from '@/shared/constants/dom'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types/types'
import trackKeydown from '.'

const MONDAY = AVAILABILITY_DAYS[0]
const EMPTY_RANGES: EditableRange[] = []
const FULLY_BOOKED_RANGE: EditableRange = {
  clientId: 'monday',
  weekday: MONDAY.weekday,
  startsAt: '00:00',
  endsAt: '23:59',
  note: null,
}
const ENTER_KEY = ENTER
const SPACE_KEY = ' '
const OTHER_KEY = TAB
const EXPECTED_SLOT = { startsAt: '00:00', endsAt: '01:00' }

function buildProps() {
  const props = {
    day: MONDAY,
    ranges: EMPTY_RANGES,
    workday: null,
    readOnly: false,
    onChange: () => undefined,
    onOpen: () => undefined,
    onCreate: () => undefined,
    onAdd: vi.fn(),
  }

  return props
}

function fireKey(key: string) {
  const props = buildProps()
  const handler = trackKeydown(props, EMPTY_RANGES)
  const preventDefault = vi.fn()

  handler?.({ key, preventDefault })

  return { props, preventDefault }
}

it('creates the next free slot on Enter', () => {
  const { props, preventDefault } = fireKey(ENTER_KEY)

  expect(preventDefault).toHaveBeenCalled()
  expect(props.onAdd).toHaveBeenCalledWith(MONDAY, EXPECTED_SLOT)
})

it('creates the next free slot on Space', () => {
  const { props, preventDefault } = fireKey(SPACE_KEY)

  expect(preventDefault).toHaveBeenCalled()
  expect(props.onAdd).toHaveBeenCalledWith(MONDAY, EXPECTED_SLOT)
})

it('ignores any other key', () => {
  const { props, preventDefault } = fireKey(OTHER_KEY)

  expect(preventDefault).not.toHaveBeenCalled()
  expect(props.onAdd).not.toHaveBeenCalled()
})

it('returns no handler when the grid is read-only', () => {
  const props = { ...buildProps(), readOnly: true }

  expect(trackKeydown(props, EMPTY_RANGES)).toBeUndefined()
})

it('no-ops without throwing when the day is fully booked', () => {
  const props = buildProps()
  const handler = trackKeydown(props, [FULLY_BOOKED_RANGE])
  const preventDefault = vi.fn()

  expect(() => handler?.({ key: ENTER_KEY, preventDefault })).not.toThrow()
  expect(props.onAdd).not.toHaveBeenCalled()
})
