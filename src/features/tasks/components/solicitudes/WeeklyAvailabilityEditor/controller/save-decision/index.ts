import {
  SAVE_FAILURE,
  SAVE_SUCCESS,
  VALIDATION_FAILURE,
} from './constants'
import type {
  SaveFailureOutcome,
  SaveOutcome,
  SaveOutcomeInput,
  SaveSuccessOutcome,
  ValidationFailureOutcome,
} from './types'

export default function decideSaveOutcome({
  state,
  result,
  onSaved,
}: SaveOutcomeInput): SaveOutcome {
  if ('errors' in result) {
    const outcome: ValidationFailureOutcome = {
      kind: VALIDATION_FAILURE,
      state,
      errors: result.errors,
      shouldFocusValidation: true,
    }
    return outcome
  }

  if ('response' in result) {
    const outcome: SaveSuccessOutcome = {
      kind: SAVE_SUCCESS,
      state,
      response: result.response,
      onSaved,
      shouldFocusValidation: false,
    }
    return outcome
  }

  const outcome: SaveFailureOutcome = {
    kind: SAVE_FAILURE,
    state,
    error: result.error,
    shouldFocusValidation: false,
  }
  return outcome
}

// This boundary names the next orchestration outcome without performing side effects.
