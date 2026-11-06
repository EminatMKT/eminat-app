import type { LocalEditorState, RangeListChangeHandler } from '../component-types'
import type { EditorProps } from '../types'
import type { RangeValidationError } from '@/features/tasks/utils/availability'

export type ControllerProps = Pick<EditorProps, 'member' | 'onCancel' | 'onSaved'>

export type ControllerResult = {
  state: LocalEditorState
  errors: RangeValidationError[]
  onChangeRanges: RangeListChangeHandler
  onSave: () => Promise<void>
  onCancel: () => void
}

/** The controller's contract plus the token `index.tsx` watches to focus the validation banner. */
export type WeeklyAvailabilityEditorControllerResult = ControllerResult & {
  validationFocusToken: number
}
