import { DRAG_MOVEMENT_THRESHOLD_PX } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/gestures/constants'
import type { GesturePointerEvent } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/gestures/types'
import type { CreateGestureState } from '../types'

/** Flags a create gesture as a drag once the pointer travels past the movement threshold —
 *  the only thing that decides a click-create from a drag-create at release. */
export default function handlePointerMove(
  state: CreateGestureState,
  event: GesturePointerEvent,
): void {
  const { active } = state
  const { pointerId, clientY } = event

  if (!active || pointerId !== active.pointerId) return

  const distance = Math.abs(clientY - active.originClientY)

  active.moved = active.moved || distance >= DRAG_MOVEMENT_THRESHOLD_PX
}

// This module is the only place a create gesture's click-vs-drag flag gets decided.
