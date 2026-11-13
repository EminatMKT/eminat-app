import freeWindow from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/free-window'
import columnMinuteAt from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/gestures/column-minute'
import type { GesturePointerEvent } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/gestures/types'
import type {
  CreateGestureConfig,
  CreateGestureState,
} from '../types'

/** Starts a create gesture at the pointer's origin, or never starts one at all when that point
 *  sits inside an existing range — the no-overlap guard runs before any pointer capture. */
export default function handlePointerDown(
  config: CreateGestureConfig,
  state: CreateGestureState,
  event: GesturePointerEvent,
): void {
  const { dayRanges, column } = config
  const { pointerId, clientY, currentTarget } = event

  const originMinute = columnMinuteAt(column, clientY)
  const freeRange = freeWindow(dayRanges, originMinute)

  if (!freeRange) return

  state.active = {
    pointerId,
    originClientY: clientY,
    originMinute,
    freeRange,
    moved: false,
  }
  currentTarget.setPointerCapture(pointerId)
}

// This module is the only place a create gesture's origin and pointer capture get established.
