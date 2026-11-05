import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import type { GesturePointerEvent } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/gestures/types'
import type { CreateGestureConfig } from './types'
import wireCreateGesture from '.'

const MONDAY = 1
const POINTER_ID = 1
const NO_OVERRIDES: Partial<CreateGestureConfig> = {}

const buildConfig = (
  overrides: Partial<CreateGestureConfig> = NO_OVERRIDES,
): CreateGestureConfig => ({
  dayRanges: [],
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

describe('wireCreateGesture', () => {
  it('commits a bounded click on a plain pointerdown/pointerup', () => {
    const onCommit = vi.fn()
    const handlers = wireCreateGesture(buildConfig({ onCommit }))

    handlers.onPointerDown(buildEvent(200))
    handlers.onPointerUp(buildEvent(200))

    expect(onCommit).toHaveBeenCalledWith({ bounds: { start: 90, end: 150 }, openPopover: false })
  })

  it('commits the dragged range and requests the popover once moved', () => {
    const onCommit = vi.fn()
    const handlers = wireCreateGesture(buildConfig({ onCommit }))

    handlers.onPointerDown(buildEvent(200))
    handlers.onPointerMove(buildEvent(400))
    handlers.onPointerUp(buildEvent(400))

    expect(onCommit).toHaveBeenCalledWith({ bounds: { start: 90, end: 210 }, openPopover: true })
  })

  it('never starts a gesture over an occupied point', () => {
    const onCommit = vi.fn()
    const occupied: WeeklyAvailabilityRange = { weekday: MONDAY, startsAt: '00:00', endsAt: '02:00' }
    const handlers = wireCreateGesture(buildConfig({ dayRanges: [occupied], onCommit }))
    const event = buildEvent(120)

    handlers.onPointerDown(event)
    handlers.onPointerUp(event)

    expect(onCommit).not.toHaveBeenCalled()
    expect(event.currentTarget.setPointerCapture).not.toHaveBeenCalled()
  })

  it('aborts a gesture in progress on pointercancel, without committing', () => {
    const onCommit = vi.fn()
    const handlers = wireCreateGesture(buildConfig({ onCommit }))
    const downEvent = buildEvent(200)

    handlers.onPointerDown(downEvent)
    handlers.onPointerCancel(downEvent)
    handlers.onPointerUp(downEvent)

    expect(onCommit).not.toHaveBeenCalled()
  })

  it('aborts a gesture in progress on lostpointercapture, without committing', () => {
    const onCommit = vi.fn()
    const handlers = wireCreateGesture(buildConfig({ onCommit }))
    const downEvent = buildEvent(200)

    handlers.onPointerDown(downEvent)
    handlers.onLostPointerCapture(downEvent)
    handlers.onPointerUp(downEvent)

    expect(onCommit).not.toHaveBeenCalled()
  })

  it('disables every handler when readOnly', () => {
    const onCommit = vi.fn()
    const handlers = wireCreateGesture(buildConfig({ onCommit, readOnly: true }))
    const event = buildEvent(200)

    handlers.onPointerDown(event)
    handlers.onPointerUp(event)

    expect(onCommit).not.toHaveBeenCalled()
    expect(event.currentTarget.setPointerCapture).not.toHaveBeenCalled()
  })
})
