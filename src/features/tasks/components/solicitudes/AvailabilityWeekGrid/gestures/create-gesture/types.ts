import type { WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import type { MinuteBounds } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/types'
import type {
  GestureColumnGeometry,
  GesturePointerEvent,
} from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/gestures/types'

/** What a finished create gesture hands back: the bounds to commit, and whether the caller
 *  should open the popover for confirmation (true for a drag, false for a bare click). */
export type CreateGestureCommit = {
  bounds: MinuteBounds
  openPopover: boolean
}

/** What one day column's create gesture needs: that day's existing ranges (to reject a start
 *  inside one of them), the column's own geometry, where to send a finished gesture, and
 *  whether the gesture is disabled entirely. */
export type CreateGestureConfig = {
  dayRanges: WeeklyAvailabilityRange[]
  column: GestureColumnGeometry
  onCommit: (commit: CreateGestureCommit) => void
  readOnly: boolean
}

/** A create gesture in progress: the free window it started in, its origin point, and whether
 *  the pointer has moved past the click/drag threshold yet. */
export type ActiveCreateGesture = {
  pointerId: number
  originClientY: number
  originMinute: number
  freeRange: MinuteBounds
  moved: boolean
}

/** Mutable across one column's lifetime; `null` means no gesture is in progress. */
export type CreateGestureState = {
  active: ActiveCreateGesture | null
}

/** The pointer handlers one day column wires onto its empty-space create surface. */
export type CreateGestureHandlers = {
  onPointerDown: (event: GesturePointerEvent) => void
  onPointerMove: (event: GesturePointerEvent) => void
  onPointerUp: (event: GesturePointerEvent) => void
  onPointerCancel: (event: GesturePointerEvent) => void
  onLostPointerCapture: (event: GesturePointerEvent) => void
}
