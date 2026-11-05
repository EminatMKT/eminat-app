import handlePointerDown from './grab'
import handlePointerUp from './release'
import abortGesture from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/gestures/abort-gesture'
import type { GesturePointerEvent } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/gestures/types'
import type { BlockResizeEdge } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/Block/types'
import type {
  ResizeGestureConfig,
  ResizeGestureContext,
  ResizeGestureHandlers,
  ResizeGestureState,
} from './types'

const noop = (): void => undefined
const RESIZE_GESTURE_NOOP_HANDLERS: ResizeGestureHandlers = {
  onPointerDown: noop,
  onPointerUp: noop,
  onPointerCancel: noop,
  onLostPointerCapture: noop,
}

function buildResizePointerHandlers(config: ResizeGestureConfig, state: ResizeGestureState) {
  const context: ResizeGestureContext = { config, state }
  const onPointerDown = (edge: BlockResizeEdge, event: GesturePointerEvent) =>
    handlePointerDown(context, edge, event)
  const onPointerUp = (event: GesturePointerEvent) => handlePointerUp(config, state, event)

  return { onPointerDown, onPointerUp }
}

function buildLifecycleHandlers(state: ResizeGestureState) {
  const onPointerCancel = (event: GesturePointerEvent) => abortGesture(state, event)

  return { onPointerCancel, onLostPointerCapture: onPointerCancel }
}

/** Wires one block's resize handles onto the pointer handlers it returns. `readOnly`
 *  short-circuits to inert handlers — nothing starts, nothing captures. */
export default function wireResizeGesture(config: ResizeGestureConfig): ResizeGestureHandlers {
  if (config.readOnly) return RESIZE_GESTURE_NOOP_HANDLERS
  const state: ResizeGestureState = { active: null }
  const pointerHandlers = buildResizePointerHandlers(config, state)
  const lifecycleHandlers = buildLifecycleHandlers(state)
  const handlers = { ...pointerHandlers, ...lifecycleHandlers }

  return handlers
}

// This module is the one public entry point Task 9 calls to get one block's resize gesture.
