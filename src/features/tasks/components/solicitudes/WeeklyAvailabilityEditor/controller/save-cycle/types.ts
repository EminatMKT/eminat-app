import type { LocalEditorState } from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'

/** The controller's own data: the editable ranges plus the validation-focus bump counter. */
export type ControllerState = {
  editor: LocalEditorState
  focusToken: number
}
