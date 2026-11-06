import type { ControllerResult } from '../controller/types'

/** EditorActions' own prop shape, derived from the controller's status/message/handlers. */
export default function buildActionsProps(controller: ControllerResult) {
  const { state, onCancel, onSave } = controller
  const feedback = { status: state.status, message: state.message }
  const handlers = { onCancel, onSave: () => void onSave() }

  return { ...feedback, ...handlers }
}

// Isolated so useEditorView and WeeklyAvailabilityEditor both stay within their own line budget.
