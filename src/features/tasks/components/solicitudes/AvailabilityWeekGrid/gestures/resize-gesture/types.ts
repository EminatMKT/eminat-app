import type { WeeklyAvailabilityRange } from '@/features/tasks/utils/availability'
import type { MinuteBounds } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/geometry/types'
import type {
  GestureColumnGeometry,
  GesturePointerEvent,
} from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/gestures/types'
import type { BlockResizeEdge } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Block/types'

/** What a finished resize gesture hands back: which edge moved, and the bounds to commit. */
export type ResizeGestureCommit = {
  edge: BlockResizeEdge
  bounds: MinuteBounds
}

/** What one block's resize gesture needs: the day's other ranges (for the neighbor clamp), the
 *  block's own bounds at gesture start, the column's geometry, where to send a finished resize,
 *  and whether the gesture is disabled entirely. */
export type ResizeGestureConfig = {
  otherDayRanges: WeeklyAvailabilityRange[]
  currentBounds: MinuteBounds
  column: GestureColumnGeometry
  onCommit: (commit: ResizeGestureCommit) => void
  readOnly: boolean
}

/** A resize gesture in progress: which edge is being dragged, and the frozen travel limit —
 *  `resizeBounds`, computed once at gesture start, never recomputed on move. */
export type ActiveResizeGesture = {
  pointerId: number
  edge: BlockResizeEdge
  limit: MinuteBounds
}

/** Mutable across one block's lifetime; `null` means no gesture is in progress. */
export type ResizeGestureState = {
  active: ActiveResizeGesture | null
}

/** `config` and `state` bundled into one value, so the pointer-down wrapper — which already
 *  takes the handle's own `edge` and `event` — stays within the three-parameter cap. */
export type ResizeGestureContext = {
  config: ResizeGestureConfig
  state: ResizeGestureState
}

/** The pointer handlers one block's resize handle wires onto its edge-drag surface. */
export type ResizeGestureHandlers = {
  onPointerDown: (edge: BlockResizeEdge, event: GesturePointerEvent) => void
  onPointerUp: (event: GesturePointerEvent) => void
  onPointerCancel: (event: GesturePointerEvent) => void
  onLostPointerCapture: (event: GesturePointerEvent) => void
}
