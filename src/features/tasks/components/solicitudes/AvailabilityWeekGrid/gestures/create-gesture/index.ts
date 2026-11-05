import handlePointerDown from './handle-pointer-down'
import handlePointerMove from './handle-pointer-move'
import handlePointerUp from './handle-pointer-up'
import abortGesture from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/gestures/abort-gesture'
import type { GesturePointerEvent } from '@/features/tasks/components/solicitudes/AvailabilityWeekGrid/gestures/types'
import type {
  CreateGestureConfig,
  CreateGestureHandlers,
  CreateGestureState,
} from './types'

const noop = (): void => undefined
const CREATE_GESTURE_NOOP_HANDLERS: CreateGestureHandlers = {
  onPointerDown: noop,
  onPointerMove: noop,
  onPointerUp: noop,
  onPointerCancel: noop,
  onLostPointerCapture: noop,
}

function buildCreatePointerHandlers(config: CreateGestureConfig, state: CreateGestureState) {
  const onPointerDown = (event: GesturePointerEvent) => handlePointerDown(config, state, event)
  const onPointerMove = (event: GesturePointerEvent) => handlePointerMove(state, event)
  const onPointerUp = (event: GesturePointerEvent) => handlePointerUp(config, state, event)

  return { onPointerDown, onPointerMove, onPointerUp }
}

function buildLifecycleHandlers(state: CreateGestureState) {
  const onPointerCancel = (event: GesturePointerEvent) => abortGesture(state, event)

  return { onPointerCancel, onLostPointerCapture: onPointerCancel }
}

/** Wires one day column's click/drag-to-create gesture onto the pointer handlers it returns.
 *  `readOnly` short-circuits to inert handlers — nothing starts, nothing captures. */
export default function wireCreateGesture(config: CreateGestureConfig): CreateGestureHandlers {
  if (config.readOnly) return CREATE_GESTURE_NOOP_HANDLERS
  const state: CreateGestureState = { active: null }
  const pointerHandlers = buildCreatePointerHandlers(config, state)
  const lifecycleHandlers = buildLifecycleHandlers(state)
  const handlers = { ...pointerHandlers, ...lifecycleHandlers }

  return handlers
}

// This module is the one public entry point Task 9 calls to get one day column's create gesture.
