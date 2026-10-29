import type {
  LocalEditorState,
} from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types'
import type {
  EditorProps,
} from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/types'
import type {
  SaveFlowFailure,
  SaveFlowResult,
  SaveFlowSuccess,
  SaveFlowValidation,
} from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/save-flow/types'

type SaveOutcomeContext = {
  state: LocalEditorState
}

export type ValidationFailureKind = 'validation-failure'
export type SaveSuccessKind = 'save-success'
export type SaveFailureKind = 'save-failure'

/** Inputs available when the save flow has completed. */
export type SaveOutcomeInput = SaveOutcomeContext & {
  result: SaveFlowResult
} & Pick<EditorProps, 'onSaved'>

/** Outcome for ranges that need validation feedback. */
export type ValidationFailureOutcome = SaveOutcomeContext &
  Pick<SaveFlowValidation, 'errors'> & {
    kind: ValidationFailureKind
    shouldFocusValidation: true
  }

/** Outcome for an availability response that was saved successfully. */
export type SaveSuccessOutcome = SaveOutcomeContext &
  Pick<SaveFlowSuccess, 'response'> &
  Pick<SaveOutcomeInput, 'onSaved'> & {
    kind: SaveSuccessKind
    shouldFocusValidation: false
  }

/** Outcome for a save operation that could not complete. */
export type SaveFailureOutcome = SaveOutcomeContext &
  Pick<SaveFlowFailure, 'error'> & {
    kind: SaveFailureKind
    shouldFocusValidation: false
  }

export type SaveOutcome =
  | ValidationFailureOutcome
  | SaveSuccessOutcome
  | SaveFailureOutcome
