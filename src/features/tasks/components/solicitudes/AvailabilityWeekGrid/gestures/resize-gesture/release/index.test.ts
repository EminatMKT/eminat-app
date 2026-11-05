import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { BlockResizeEdge } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Block/types'
import type { GesturePointerEvent } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/gestures/types'
import type {
  ActiveResizeGesture,
  ResizeGestureCommit,
  ResizeGestureConfig,
  ResizeGestureState,
} from '../types'
import handlePointerUp from '.'

const POINTER_ID = 1
const TOP_EDGE: BlockResizeEdge = 'top'
const BOTTOM_EDGE: BlockResizeEdge = 'bottom'

type OnCommit = (commit: ResizeGestureCommit) => void

const buildConfig = (onCommit: OnCommit): ResizeGestureConfig => ({
  otherDayRanges: [],
  currentBounds: { start: 600, end: 660 },
  column: { columnTop: 0, pxPerMin: 2 },
  onCommit,
  readOnly: false,
})

const buildActive = (edge: BlockResizeEdge): ActiveResizeGesture => ({
  pointerId: POINTER_ID,
  edge,
  limit: { start: 0, end: 1440 },
})

const buildEvent = (clientY: number): GesturePointerEvent => ({
  pointerId: POINTER_ID,
  clientY,
  currentTarget: { setPointerCapture: vi.fn(), releasePointerCapture: vi.fn() },
})

describe('handlePointerUp', () => {
  it('commits the dragged top edge, releases capture, and clears the active state', () => {
    const onCommit = vi.fn()
    const config = buildConfig(onCommit)
    const state: ResizeGestureState = { active: buildActive(TOP_EDGE) }
    const event = buildEvent(1020)

    handlePointerUp(config, state, event)

    expect(onCommit).toHaveBeenCalledWith({
      edge: TOP_EDGE,
      bounds: { start: 510, end: 660 },
    })
    expect(event.currentTarget.releasePointerCapture).toHaveBeenCalledWith(POINTER_ID)
    expect(state.active).toBeNull()
  })

  it('commits the dragged bottom edge', () => {
    const onCommit = vi.fn()
    const config = buildConfig(onCommit)
    const state: ResizeGestureState = { active: buildActive(BOTTOM_EDGE) }
    const event = buildEvent(1500)

    handlePointerUp(config, state, event)

    expect(onCommit).toHaveBeenCalledWith({
      edge: BOTTOM_EDGE,
      bounds: { start: 600, end: 750 },
    })
  })

  it('is a no-op when no gesture is active', () => {
    const onCommit = vi.fn()
    const config = buildConfig(onCommit)
    const state: ResizeGestureState = { active: null }

    handlePointerUp(config, state, buildEvent(1020))

    expect(onCommit).not.toHaveBeenCalled()
  })
})
