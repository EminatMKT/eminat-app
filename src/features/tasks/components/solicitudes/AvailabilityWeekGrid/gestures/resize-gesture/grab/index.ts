import resizeBounds from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/resize-bounds'
import type { BlockResizeEdge } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Block/types'
import type { GesturePointerEvent } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/gestures/types'
import type { ResizeGestureContext } from '../types'

/** Starts a resize gesture on the dragged `edge`: freezes its travel `limit` against the day's
 *  other ranges, captures the pointer, and records both so a later move resolves against the
 *  same limit the gesture started with. A no-op while `readOnly`. */
export default function handlePointerDown(
  context: ResizeGestureContext,
  edge: BlockResizeEdge,
  event: GesturePointerEvent,
): void {
  const { config, state } = context

  if (config.readOnly) return

  const limit = resizeBounds(config.otherDayRanges, config.currentBounds)

  state.active = { pointerId: event.pointerId, edge, limit }
  event.currentTarget.setPointerCapture(event.pointerId)
}

// This module is the only place a resize gesture's frozen travel limit gets computed.
