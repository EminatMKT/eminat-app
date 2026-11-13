import type { SegmentCanvasProps } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/types'
import type { GesturePointerEvent } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/gestures/types'
import type { ResizeGestureHandlers, ResizeGestureCommit } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/gestures/resize-gesture/types'
import type { BlockResizeEdge } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Block/types'

/** Only the live segment data needed by a resize pointer. */
export type SegmentResizeInput = Pick<SegmentCanvasProps,
  'range' | 'dayRanges' | 'ranges' | 'columnTop' | 'readOnly' | 'onChange'>

/** Reading at event time avoids freezing callbacks or the containing week. */
export type ReadSegment = () => SegmentResizeInput

/** Handle events must not bubble into the day track's creation gesture. */
export type ResizePointerEvent = GesturePointerEvent & Pick<Event, 'stopPropagation'>

/** A handle start needs propagation control in addition to gesture coordinates. */
export type ResizePointerStart = (edge: BlockResizeEdge, event: ResizePointerEvent) => void

/** A completed gesture supplies bounds for validation against the live week. */
export type ResizeCommitCallback = (commit: ResizeGestureCommit) => void

/** Lifecycle forwarding accepts the canonical captured-pointer event. */
export type ResizeLifecycleHandler = (event: GesturePointerEvent) => void

/** One active pointer lifecycle belongs to one mounted segment. */
export type ResizePointerContext = {
  read: ReadSegment
  active: ResizeGestureHandlers | null
}
