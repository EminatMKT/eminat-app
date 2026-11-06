import { isValidElement, type ReactElement } from 'react'
import { expect, it, vi } from 'vitest'
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
// Named via vi.hoisted so the value exists before Vitest hoists the vi.mock call below it
// (matches DayNumber/DayEntry's hoisted-mock pattern for the same reason).
const { EMPTY_CLASS_NAME, WEEK_GRID_CSS_MODULE_PATH } = vi.hoisted(() => ({
  EMPTY_CLASS_NAME: 'empty',
  WEEK_GRID_CSS_MODULE_PATH:
    '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/index.module.css',
}))

// Matches the module's class name so the empty-state assertion checks the real selector, not a
// content hash (same pattern as Counter/DayNumber's CSS module mocks).
vi.mock(WEEK_GRID_CSS_MODULE_PATH, () => ({ default: { empty: EMPTY_CLASS_NAME } }))

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
  expect(empty.props.className).toBe(EMPTY_CLASS_NAME)
})
