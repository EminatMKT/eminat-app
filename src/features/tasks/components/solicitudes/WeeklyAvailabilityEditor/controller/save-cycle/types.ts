import type {
  EditableRange,
  LocalEditorState,
} from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types/types'

/** The controller's own data: the editable ranges, the validation-focus bump counter, and the
 *  last-saved baseline `isDirty` diffs against. */
export type ControllerState = {
  editor: LocalEditorState
  focusToken: number
  savedRanges: EditableRange[]
}
