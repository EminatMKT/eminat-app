import { isValidElement, type ReactElement } from 'react'
import { expect, it } from 'vitest'
import { AVAILABILITY_DAYS } from '@/features/tasks/utils/availability'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import renderTrack from '.'

const RANGE: EditableRange = {
  clientId: 'monday',
  weekday: 1,
  startsAt: '09:00',
  endsAt: '10:00',
  note: null,
}
const NOOP = () => undefined
const ZERO_TOP = () => 0
const EMPTY_LABEL = 'nothing declared'
const NOT_AN_ARRAY_MESSAGE = 'expected a single empty-state element'
const NOT_A_SEGMENT_LIST_MESSAGE = 'expected an array of segments'

function buildProps(ranges: (typeof RANGE)[]) {
  const props = {
    day: AVAILABILITY_DAYS[0],
    ranges,
    workday: null,
    readOnly: false,
    onChange: NOOP,
    onOpen: NOOP,
    onCreate: NOOP,
    onAdd: NOOP,
  }

  return props
}

function expectSegments(result: ReactElement | ReactElement[]): ReactElement[] {
  if (!Array.isArray(result)) throw new Error(NOT_A_SEGMENT_LIST_MESSAGE)

  return result
}

function expectSingle(result: ReactElement | ReactElement[]): ReactElement {
  if (Array.isArray(result)) throw new Error(NOT_AN_ARRAY_MESSAGE)

  return result
}

it('renders one SegmentCanvas element per day range', () => {
  const props = buildProps([RANGE])
  const input = { dayRanges: [RANGE], columnTop: ZERO_TOP, t: () => EMPTY_LABEL }
  const segments = expectSegments(renderTrack(props, input))

  expect(segments).toHaveLength(1)
  expect(segments[0].props.range).toEqual(RANGE)
})

it('renders the translated empty message when the day has no ranges', () => {
  const props = buildProps([])
  const input = { dayRanges: [], columnTop: ZERO_TOP, t: () => EMPTY_LABEL }
  const empty = expectSingle(renderTrack(props, input))

  expect(isValidElement(empty)).toBe(true)
  expect(empty.props.children).toBe(EMPTY_LABEL)
})
