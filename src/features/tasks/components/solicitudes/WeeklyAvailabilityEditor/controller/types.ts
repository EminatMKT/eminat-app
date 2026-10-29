import type { EditorViewModel } from '../editor-view-model/types'
import type {
  LocalEditorState,
  RangeActionHandler,
  RangeChangeHandler,
} from '../component-types'
import type { EditorProps } from '../types'
import type { RangeValidationError, Weekday } from '@/features/tasks/utils/availability'

export type ControllerProps = Pick<EditorProps, 'member' | 'onCancel' | 'onSaved'>

type AddRangeHandler = (weekday: Weekday) => void

export type ControllerResult = {
  state: LocalEditorState
  viewModel: EditorViewModel
  errors: RangeValidationError[]
  onChangeRange: RangeChangeHandler
  onAddRange: AddRangeHandler
  onRemoveRange: RangeActionHandler
  onSave: () => Promise<void>
  onCancel: () => void
}

/** The controller's contract plus the token `index.tsx` watches to move focus to the validation banner. */
export type WeeklyAvailabilityEditorControllerResult = ControllerResult & {
  validationFocusToken: number
}
