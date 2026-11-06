import { DRAG_MOVEMENT_THRESHOLD_PX } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/gestures/constants'
import dragCreateRange from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/creation/drag'
import columnMinuteAt from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/gestures/column-minute'
import type { GesturePointerEvent } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/gestures/types'
import type {
  ActiveCreateGesture,
  CreateGestureConfig,
  CreateGestureState,
} from '../types'

function previewBoundsOf(
  config: CreateGestureConfig,
  active: ActiveCreateGesture,
  clientY: number,
) {
  const currentMinute = columnMinuteAt(config.column, clientY)

  return dragCreateRange(active.freeRange, active.originMinute, currentMinute)
}

/** Flags a create gesture as a drag once the pointer travels past the movement threshold, and
 *  reports the live preview bounds for as long as it stays one — the only place a create
 *  gesture's click-vs-drag flag and its drag-in-progress preview get decided. */
export default function handlePointerMove(
  config: CreateGestureConfig,
  state: CreateGestureState,
  event: GesturePointerEvent,
): void {
  const { active } = state
  const { pointerId, clientY } = event

  if (!active || pointerId !== active.pointerId) return

  const distance = Math.abs(clientY - active.originClientY)

  active.moved = active.moved || distance >= DRAG_MOVEMENT_THRESHOLD_PX

  if (active.moved) config.onPreview(previewBoundsOf(config, active, clientY))
}

// This module decides a create gesture's click-vs-drag flag and its live preview, nothing else.
