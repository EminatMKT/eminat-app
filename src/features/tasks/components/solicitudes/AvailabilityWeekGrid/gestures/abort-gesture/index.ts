import type { GesturePointerEvent } from '../types'

/** Clears a gesture's active state when it is cancelled or loses capture mid-drag, so a pointer
 *  yanked away (back-gesture, a parent scroll steal) never leaves a gesture stuck active.
 *  Shared by create-gesture and resize-gesture: both key their active state by `pointerId`. */
export default function abortGesture<T extends { pointerId: number }>(
  state: { active: T | null },
  event: GesturePointerEvent,
): void {
  const { active } = state
  const { pointerId } = event

  if (active && pointerId === active.pointerId) state.active = null
}

// This module is the one place a gesture's active state gets cleared on cancel or lost capture.
