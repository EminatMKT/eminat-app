import {
  clickCreateRange,
  dragCreateRange,
} from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/creation'
import columnMinuteAt from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/gestures/column-minute'
import type { GesturePointerEvent } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/gestures/types'
import type {
  ActiveCreateGesture,
  CreateGestureCommit,
  CreateGestureConfig,
  CreateGestureState,
} from '../types'

function resolveCreateBounds(active: ActiveCreateGesture, currentMinute: number) {
  const { moved, freeRange, originMinute } = active

  if (moved) return dragCreateRange(freeRange, originMinute, currentMinute)

  return clickCreateRange(freeRange, originMinute)
}

function resolveCreateCommit(
  active: ActiveCreateGesture,
  currentMinute: number,
): CreateGestureCommit {
  const bounds = resolveCreateBounds(active, currentMinute)

  return { bounds, openPopover: true }
}

/** Commits a create gesture on release: a click resolves to its bounded default, a drag to the
 *  free-form range it was tracking, and either way the caller opens the popover so the user can
 *  review, adjust or confirm what just got created. */
export default function handlePointerUp(
  config: CreateGestureConfig,
  state: CreateGestureState,
  event: GesturePointerEvent,
): void {
  const { active } = state
  const { pointerId, clientY, currentTarget } = event

  if (!active || pointerId !== active.pointerId) return

  const currentMinute = columnMinuteAt(config.column, clientY)
  const commit = resolveCreateCommit(active, currentMinute)

  currentTarget.releasePointerCapture(pointerId)
  state.active = null
  config.onPreview(null)
  config.onCommit(commit)
}

// This module is the only place a create gesture's final bounds and popover signal get decided.
