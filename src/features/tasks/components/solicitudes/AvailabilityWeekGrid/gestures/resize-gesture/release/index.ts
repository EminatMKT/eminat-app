import columnMinuteAt from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/gestures/column-minute'
import {
  resizeBottomEdge,
  resizeTopEdge,
  TOP_EDGE,
} from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry'
import type { GesturePointerEvent } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/gestures/types'
import type {
  ActiveResizeGesture,
  ResizeGestureCommit,
  ResizeGestureConfig,
  ResizeGestureState,
} from '../types'

function resolveEdgeBounds(
  active: ActiveResizeGesture,
  config: ResizeGestureConfig,
  rawMinute: number,
) {
  const { edge, limit } = active
  const { currentBounds } = config

  if (edge === TOP_EDGE) return resizeTopEdge(limit, currentBounds, rawMinute)

  return resizeBottomEdge(limit, currentBounds, rawMinute)
}

/** Commits a resize gesture on release: resolves the dragged edge's snapped, clamped bounds
 *  against the limit frozen at gesture start, releases capture, and clears the active state. */
export default function handlePointerUp(
  config: ResizeGestureConfig,
  state: ResizeGestureState,
  event: GesturePointerEvent,
): void {
  const { active } = state
  const { pointerId, clientY, currentTarget } = event

  if (!active || pointerId !== active.pointerId) return

  const rawMinute = columnMinuteAt(config.column, clientY)
  const bounds = resolveEdgeBounds(active, config, rawMinute)
  const commit: ResizeGestureCommit = { edge: active.edge, bounds }

  currentTarget.releasePointerCapture(pointerId)
  state.active = null
  config.onCommit(commit)
}

// This module is the only place a resize gesture's final edge bounds get resolved and committed.
