import type { ReactElement } from 'react'
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

function expectSegments(result: ReactElement[] | null): ReactElement[] {
  if (!Array.isArray(result)) throw new Error(NOT_A_SEGMENT_LIST_MESSAGE)

  return result
}

it('renders one SegmentCanvas element per day range', () => {
  const props = buildProps([RANGE])
  const input = { dayRanges: [RANGE], columnTop: ZERO_TOP, t: () => EMPTY_LABEL }
  const segments = expectSegments(renderTrack(props, input))

  expect(segments).toHaveLength(1)
  expect(segments[0].props.range).toEqual(RANGE)
})

// The week-level message above the grid is the empty state; a day column stays a bare track.
it('renders nothing for a day with no ranges', () => {
  const props = buildProps([])
  const input = { dayRanges: [], columnTop: ZERO_TOP, t: () => EMPTY_LABEL }

  expect(renderTrack(props, input)).toBeNull()
})
