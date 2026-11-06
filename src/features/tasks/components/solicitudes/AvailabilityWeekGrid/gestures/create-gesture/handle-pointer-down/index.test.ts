import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import type { GesturePointerEvent } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/gestures/types'
import type {
  CreateGestureConfig,
  CreateGestureState,
} from '../types'
import handlePointerDown from '.'

const MONDAY = 1
const POINTER_ID = 1
const FREE_CLIENT_Y = 200
const OCCUPIED_CLIENT_Y = 120

const buildConfig = (dayRanges: WeeklyAvailabilityRange[]): CreateGestureConfig => ({
  dayRanges,
  column: { columnTop: 0, pxPerMin: 2 },
  onCommit: vi.fn(),
  onPreview: vi.fn(),
  readOnly: false,
})

const buildEvent = (clientY: number): GesturePointerEvent => ({
  pointerId: POINTER_ID,
  clientY,
  currentTarget: { setPointerCapture: vi.fn(), releasePointerCapture: vi.fn() },
})

describe('handlePointerDown', () => {
  it('starts a gesture and captures the pointer when the origin is free', () => {
    const config = buildConfig([])
    const state: CreateGestureState = { active: null }
    const event = buildEvent(FREE_CLIENT_Y)

    handlePointerDown(config, state, event)

    expect(state.active).toEqual({
      pointerId: POINTER_ID,
      originClientY: FREE_CLIENT_Y,
      originMinute: 100,
      freeRange: { start: 0, end: 1440 },
      moved: false,
    })
    expect(event.currentTarget.setPointerCapture).toHaveBeenCalledWith(POINTER_ID)
  })

  it('does not start a gesture when the origin point is occupied', () => {
    const occupied: WeeklyAvailabilityRange = { weekday: MONDAY, startsAt: '00:00', endsAt: '02:00' }
    const config = buildConfig([occupied])
    const state: CreateGestureState = { active: null }
    const event = buildEvent(OCCUPIED_CLIENT_Y)

    handlePointerDown(config, state, event)

    expect(state.active).toBeNull()
    expect(event.currentTarget.setPointerCapture).not.toHaveBeenCalled()
  })
})
