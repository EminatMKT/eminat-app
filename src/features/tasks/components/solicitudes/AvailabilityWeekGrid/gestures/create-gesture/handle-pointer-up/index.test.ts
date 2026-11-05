import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { GesturePointerEvent } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/gestures/types'
import type {
  ActiveCreateGesture,
  CreateGestureCommit,
  CreateGestureConfig,
  CreateGestureState,
} from '../types'
import handlePointerUp from '.'

const POINTER_ID = 1
const ORIGIN_MINUTE = 100
const ORIGIN_CLIENT_Y = 200

type OnCommit = (commit: CreateGestureCommit) => void

const buildConfig = (onCommit: OnCommit): CreateGestureConfig => ({
  dayRanges: [],
  column: { columnTop: 0, pxPerMin: 2 },
  onCommit,
  readOnly: false,
})

const buildClickActive = (): ActiveCreateGesture => ({
  pointerId: POINTER_ID,
  originClientY: ORIGIN_CLIENT_Y,
  originMinute: ORIGIN_MINUTE,
  freeRange: { start: 0, end: 1440 },
  moved: false,
})

const buildDragActive = (): ActiveCreateGesture => ({ ...buildClickActive(), moved: true })

const buildEvent = (clientY: number): GesturePointerEvent => ({
  pointerId: POINTER_ID,
  clientY,
  currentTarget: { setPointerCapture: vi.fn(), releasePointerCapture: vi.fn() },
})

describe('handlePointerUp', () => {
  it('commits a bounded click range without requesting the popover', () => {
    const onCommit = vi.fn()
    const config = buildConfig(onCommit)
    const state: CreateGestureState = { active: buildClickActive() }
    const event = buildEvent(ORIGIN_CLIENT_Y)

    handlePointerUp(config, state, event)

    expect(onCommit).toHaveBeenCalledWith({ bounds: { start: 90, end: 150 }, openPopover: false })
    expect(event.currentTarget.releasePointerCapture).toHaveBeenCalledWith(POINTER_ID)
    expect(state.active).toBeNull()
  })

  it('commits the dragged range and requests the popover', () => {
    const onCommit = vi.fn()
    const config = buildConfig(onCommit)
    const state: CreateGestureState = { active: buildDragActive() }
    const event = buildEvent(400)

    handlePointerUp(config, state, event)

    expect(onCommit).toHaveBeenCalledWith({ bounds: { start: 90, end: 210 }, openPopover: true })
  })

  it('is a no-op when no gesture is active', () => {
    const onCommit = vi.fn()
    const config = buildConfig(onCommit)
    const state: CreateGestureState = { active: null }

    handlePointerUp(config, state, buildEvent(ORIGIN_CLIENT_Y))

    expect(onCommit).not.toHaveBeenCalled()
  })
})
