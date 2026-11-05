import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { BlockResizeEdge } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Block/types'
import type { GesturePointerEvent } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/gestures/types'
import type { ResizeGestureConfig } from './types'
import wireResizeGesture from '.'

const POINTER_ID = 1
const TOP_EDGE: BlockResizeEdge = 'top'
const BOTTOM_EDGE: BlockResizeEdge = 'bottom'
const NO_OVERRIDES: Partial<ResizeGestureConfig> = {}

const buildConfig = (
  overrides: Partial<ResizeGestureConfig> = NO_OVERRIDES,
): ResizeGestureConfig => ({
  otherDayRanges: [],
  currentBounds: { start: 600, end: 660 },
  column: { columnTop: 0, pxPerMin: 2 },
  onCommit: vi.fn(),
  readOnly: false,
  ...overrides,
})

const buildEvent = (clientY: number): GesturePointerEvent => ({
  pointerId: POINTER_ID,
  clientY,
  currentTarget: { setPointerCapture: vi.fn(), releasePointerCapture: vi.fn() },
})

describe('wireResizeGesture', () => {
  it('commits the dragged top edge on a down/up pair', () => {
    const onCommit = vi.fn()
    const handlers = wireResizeGesture(buildConfig({ onCommit }))

    handlers.onPointerDown(TOP_EDGE, buildEvent(600))
    handlers.onPointerUp(buildEvent(1020))

    expect(onCommit).toHaveBeenCalledWith({ edge: TOP_EDGE, bounds: { start: 510, end: 660 } })
  })

  it('commits the dragged bottom edge on a down/up pair', () => {
    const onCommit = vi.fn()
    const handlers = wireResizeGesture(buildConfig({ onCommit }))

    handlers.onPointerDown(BOTTOM_EDGE, buildEvent(1320))
    handlers.onPointerUp(buildEvent(1500))

    expect(onCommit).toHaveBeenCalledWith({ edge: BOTTOM_EDGE, bounds: { start: 600, end: 750 } })
  })

  it('aborts a gesture in progress on pointercancel, without committing', () => {
    const onCommit = vi.fn()
    const handlers = wireResizeGesture(buildConfig({ onCommit }))
    const downEvent = buildEvent(600)

    handlers.onPointerDown(TOP_EDGE, downEvent)
    handlers.onPointerCancel(downEvent)
    handlers.onPointerUp(downEvent)

    expect(onCommit).not.toHaveBeenCalled()
  })

  it('aborts a gesture in progress on lostpointercapture, without committing', () => {
    const onCommit = vi.fn()
    const handlers = wireResizeGesture(buildConfig({ onCommit }))
    const downEvent = buildEvent(600)

    handlers.onPointerDown(TOP_EDGE, downEvent)
    handlers.onLostPointerCapture(downEvent)
    handlers.onPointerUp(downEvent)

    expect(onCommit).not.toHaveBeenCalled()
  })

  it('disables every handler when readOnly', () => {
    const onCommit = vi.fn()
    const handlers = wireResizeGesture(buildConfig({ onCommit, readOnly: true }))
    const event = buildEvent(600)

    handlers.onPointerDown(TOP_EDGE, event)
    handlers.onPointerUp(event)

    expect(onCommit).not.toHaveBeenCalled()
    expect(event.currentTarget.setPointerCapture).not.toHaveBeenCalled()
  })
})
