import wireResizeGesture from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/gestures/resize-gesture'
import configuration from './configuration'
import type {
  ReadSegment,
  ResizeLifecycleHandler,
  ResizePointerContext,
  ResizePointerStart,
} from './types'

function start(context: ResizePointerContext): ResizePointerStart {
  return (edge, event) => {
    const { read } = context
    const active = wireResizeGesture(configuration(read))

    event.stopPropagation()
    context.active = active
    active.onPointerDown(edge, event)
  }
}

function lifecycle(context: ResizePointerContext) {
  const active = () => context.active
  const onPointerUp: ResizeLifecycleHandler = event => active()?.onPointerUp(event)
  const onPointerCancel: ResizeLifecycleHandler = event => active()?.onPointerCancel(event)
  const onLostPointerCapture: ResizeLifecycleHandler = event =>
    active()?.onLostPointerCapture(event)
  const handlers = { onPointerUp, onPointerCancel, onLostPointerCapture }

  return handlers
}

/** Retains the captured gesture across rerenders without freezing its callbacks or week. */
export default function createResizePointer(read: ReadSegment) {
  const context: ResizePointerContext = { read, active: null }
  const onPointerDown = start(context)
  const handlers = { onPointerDown, ...lifecycle(context) }

  return handlers
}

// Handle pointerdown never reaches the track, including the block's exclusive bottom endpoint.
