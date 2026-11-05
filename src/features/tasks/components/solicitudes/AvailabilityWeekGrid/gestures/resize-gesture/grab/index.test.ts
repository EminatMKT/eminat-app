import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import type { BlockResizeEdge } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Block/types'
import type { GesturePointerEvent } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/gestures/types'
import type {
  ResizeGestureConfig,
  ResizeGestureContext,
  ResizeGestureState,
} from '../types'
import handlePointerDown from '.'

const POINTER_ID = 1
const TOP_EDGE: BlockResizeEdge = 'top'

const buildConfig = (otherDayRanges: WeeklyAvailabilityRange[]): ResizeGestureConfig => ({
  otherDayRanges,
  currentBounds: { start: 600, end: 660 },
  column: { columnTop: 0, pxPerMin: 2 },
  onCommit: vi.fn(),
  readOnly: false,
})

const buildEvent = (): GesturePointerEvent => ({
  pointerId: POINTER_ID,
  clientY: 0,
  currentTarget: { setPointerCapture: vi.fn(), releasePointerCapture: vi.fn() },
})

describe('handlePointerDown', () => {
  it('starts a gesture with the frozen limit spanning the day and captures the pointer', () => {
    const config = buildConfig([])
    const state: ResizeGestureState = { active: null }
    const context: ResizeGestureContext = { config, state }
    const event = buildEvent()

    handlePointerDown(context, TOP_EDGE, event)

    const expected = { pointerId: POINTER_ID, edge: TOP_EDGE, limit: { start: 0, end: 1440 } }

    expect(state.active).toEqual(expected)
    expect(event.currentTarget.setPointerCapture).toHaveBeenCalledWith(POINTER_ID)
  })

  it('freezes the limit clamped by a neighbor present at gesture start', () => {
    const neighbor: WeeklyAvailabilityRange = { weekday: 1, startsAt: '08:00', endsAt: '09:00' }
    const config = buildConfig([neighbor])
    const state: ResizeGestureState = { active: null }
    const context: ResizeGestureContext = { config, state }
    const event = buildEvent()

    handlePointerDown(context, TOP_EDGE, event)

    expect(state.active?.limit).toEqual({ start: 540, end: 1440 })
  })
})
