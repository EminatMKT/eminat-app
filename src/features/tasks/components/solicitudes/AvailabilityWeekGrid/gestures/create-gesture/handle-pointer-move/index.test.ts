import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { GesturePointerEvent } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/gestures/types'
import type {
  ActiveCreateGesture,
  CreateGestureConfig,
  CreateGestureState,
} from '../types'
import handlePointerMove from '.'

const POINTER_ID = 1
const ORIGIN_CLIENT_Y = 200
const ORIGIN_MINUTE = 100

const buildConfig = (onPreview = vi.fn()): CreateGestureConfig => ({
  dayRanges: [],
  column: { columnTop: 0, pxPerMin: 2 },
  onCommit: vi.fn(),
  onPreview,
  readOnly: false,
})

const buildActive = (): ActiveCreateGesture => ({
  pointerId: POINTER_ID,
  originClientY: ORIGIN_CLIENT_Y,
  originMinute: ORIGIN_MINUTE,
  freeRange: { start: 0, end: 1440 },
  moved: false,
})

const buildEvent = (clientY: number, pointerId = POINTER_ID): GesturePointerEvent => ({
  pointerId,
  clientY,
  currentTarget: { setPointerCapture: vi.fn(), releasePointerCapture: vi.fn() },
})

describe('handlePointerMove', () => {
  it('marks the gesture as moved once it crosses the drag threshold', () => {
    const active = buildActive()
    const state: CreateGestureState = { active }

    handlePointerMove(buildConfig(), state, buildEvent(ORIGIN_CLIENT_Y + 10))

    expect(state.active?.moved).toBe(true)
  })

  it('leaves the gesture as a click while under the drag threshold', () => {
    const active = buildActive()
    const state: CreateGestureState = { active }

    handlePointerMove(buildConfig(), state, buildEvent(ORIGIN_CLIENT_Y + 1))

    expect(state.active?.moved).toBe(false)
  })

  it('ignores a pointer that does not match the active gesture', () => {
    const active = buildActive()
    const state: CreateGestureState = { active }

    handlePointerMove(buildConfig(), state, buildEvent(ORIGIN_CLIENT_Y + 10, POINTER_ID + 1))

    expect(state.active?.moved).toBe(false)
  })

  it('is a no-op when no gesture is active', () => {
    const state: CreateGestureState = { active: null }
    const move = () => handlePointerMove(buildConfig(), state, buildEvent(ORIGIN_CLIENT_Y))

    expect(move).not.toThrow()
  })

  it('reports a live preview of the dragged bounds once past the drag threshold', () => {
    const onPreview = vi.fn()
    const state: CreateGestureState = { active: buildActive() }

    handlePointerMove(buildConfig(onPreview), state, buildEvent(400))

    expect(onPreview).toHaveBeenCalledWith({ start: 90, end: 210 })
  })

  it('does not report a preview before the drag threshold is crossed', () => {
    const onPreview = vi.fn()
    const state: CreateGestureState = { active: buildActive() }

    handlePointerMove(buildConfig(onPreview), state, buildEvent(ORIGIN_CLIENT_Y + 1))

    expect(onPreview).not.toHaveBeenCalled()
  })
})
