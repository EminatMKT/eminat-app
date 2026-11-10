import type {
  LocalEditorState,
} from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/component-types/types'
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

/** The shape every outcome shares: the state it settles on, its kind and whether focus moves. */
type OutcomeOf<TKind, TFocus extends boolean, TDetail> = SaveOutcomeContext & TDetail & {
  kind: TKind
  shouldFocusValidation: TFocus
}

/** Outcome for ranges that need validation feedback. */
export type ValidationFailureOutcome =
  OutcomeOf<ValidationFailureKind, true, Pick<SaveFlowValidation, 'errors'>>

/** Outcome for an availability response that was saved successfully. */
export type SaveSuccessOutcome = OutcomeOf<
  SaveSuccessKind,
  false,
  Pick<SaveFlowSuccess, 'response'> & Pick<SaveOutcomeInput, 'onSaved'>
>

/** Outcome for a save operation that could not complete. */
export type SaveFailureOutcome =
  OutcomeOf<SaveFailureKind, false, Pick<SaveFlowFailure, 'error'>>

export type SaveOutcome =
  | ValidationFailureOutcome
  | SaveSuccessOutcome
  | SaveFailureOutcome
