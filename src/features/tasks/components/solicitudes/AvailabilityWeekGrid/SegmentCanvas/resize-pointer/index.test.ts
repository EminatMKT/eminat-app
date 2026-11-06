import {
  beforeEach,
  expect,
  it,
  vi,
} from 'vitest'
import type { EditableRange } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import type { SegmentResizeInput, ResizePointerEvent } from './types'
import createResizePointer from '.'

const RANGE: EditableRange = {
  clientId: 'selected',
  weekday: 1,
  startsAt: '09:00',
  endsAt: '10:00',
  note: null,
}
const OTHER: EditableRange = { ...RANGE, clientId: 'other', weekday: 2 }
const NEIGHBOR = {
  ...RANGE,
  clientId: 'neighbor',
  startsAt: '10:30',
  endsAt: '12:00',
}
const onChange = vi.fn()
const INITIAL: SegmentResizeInput = {
  range: RANGE,
  ranges: [RANGE, OTHER],
  dayRanges: [RANGE],
  readOnly: false,
  columnTop: () => 0,
  onChange,
}
const DOWN: ResizePointerEvent = {
  pointerId: 1,
  clientY: 450,
  currentTarget: { setPointerCapture: vi.fn(), releasePointerCapture: vi.fn() },
  stopPropagation: vi.fn(),
}
const UP = { ...DOWN, clientY: 495 }
const EDGE = 'bottom'
const RESIZED = { ...RANGE, endsAt: '11:00' }
const EXPECTED = [RESIZED, OTHER]
let input = INITIAL

beforeEach(() => {
  input = INITIAL
  vi.clearAllMocks()
})

it('isolates the bottom endpoint before capture and commits the whole week', () => {
  const handlers = createResizePointer(() => input)

  handlers.onPointerDown(EDGE, DOWN)
  handlers.onPointerUp(UP)
  expect(DOWN.stopPropagation).toHaveBeenCalledOnce()
  expect(DOWN.currentTarget.setPointerCapture).toHaveBeenCalledWith(DOWN.pointerId)
  expect(onChange).toHaveBeenCalledWith(EXPECTED)
})

it('keeps the pointer while using the latest callback and week', () => {
  const latest = vi.fn()
  const changed = { ...OTHER, note: 'Updated while dragging' }
  const handlers = createResizePointer(() => input)

  handlers.onPointerDown(EDGE, DOWN)
  input = { ...input, ranges: [RANGE, changed], onChange: latest }
  handlers.onPointerUp(UP)
  expect(latest).toHaveBeenCalledWith([RESIZED, changed])
  expect(onChange).not.toHaveBeenCalled()
})

it('validates against a neighbor inserted while dragging', () => {
  const handlers = createResizePointer(() => input)

  handlers.onPointerDown(EDGE, DOWN)
  input = { ...input, ranges: [RANGE, NEIGHBOR] }
  handlers.onPointerUp(UP)
  expect(onChange).not.toHaveBeenCalled()
})

it('never captures or mutates a read-only segment', () => {
  input = { ...input, readOnly: true }
  const handlers = createResizePointer(() => input)

  handlers.onPointerDown(EDGE, DOWN)
  handlers.onPointerUp(UP)
  expect(DOWN.currentTarget.setPointerCapture).not.toHaveBeenCalled()
  expect(onChange).not.toHaveBeenCalled()
})

it('does not commit after edit permission is removed during a drag', () => {
  const handlers = createResizePointer(() => input)

  handlers.onPointerDown(EDGE, DOWN)
  input = { ...input, readOnly: true }
  handlers.onPointerUp(UP)
  expect(onChange).not.toHaveBeenCalled()
})

it('forwards pointer cancellation without a commit', () => {
  const handlers = createResizePointer(() => input)

  handlers.onPointerDown(EDGE, DOWN)
  handlers.onPointerCancel(DOWN)
  handlers.onPointerUp(UP)
  expect(onChange).not.toHaveBeenCalled()
})

it('forwards lost capture without a commit', () => {
  const handlers = createResizePointer(() => input)

  handlers.onPointerDown(EDGE, DOWN)
  handlers.onLostPointerCapture(DOWN)
  handlers.onPointerUp(UP)
  expect(onChange).not.toHaveBeenCalled()
})
