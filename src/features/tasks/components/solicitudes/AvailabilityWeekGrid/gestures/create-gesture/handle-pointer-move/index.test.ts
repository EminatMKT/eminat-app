import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { GesturePointerEvent } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/gestures/types'
import type {
  ActiveCreateGesture,
  CreateGestureState,
} from '../types'
import handlePointerMove from '.'

const POINTER_ID = 1
const ORIGIN_CLIENT_Y = 200

const buildActive = (): ActiveCreateGesture => ({
  pointerId: POINTER_ID,
  originClientY: ORIGIN_CLIENT_Y,
  originMinute: 100,
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

    handlePointerMove(state, buildEvent(ORIGIN_CLIENT_Y + 10))

    expect(state.active?.moved).toBe(true)
  })

  it('leaves the gesture as a click while under the drag threshold', () => {
    const active = buildActive()
    const state: CreateGestureState = { active }

    handlePointerMove(state, buildEvent(ORIGIN_CLIENT_Y + 1))

    expect(state.active?.moved).toBe(false)
  })

  it('ignores a pointer that does not match the active gesture', () => {
    const active = buildActive()
    const state: CreateGestureState = { active }

    handlePointerMove(state, buildEvent(ORIGIN_CLIENT_Y + 10, POINTER_ID + 1))

    expect(state.active?.moved).toBe(false)
  })

  it('is a no-op when no gesture is active', () => {
    const state: CreateGestureState = { active: null }

    expect(() => handlePointerMove(state, buildEvent(ORIGIN_CLIENT_Y))).not.toThrow()
  })
})
