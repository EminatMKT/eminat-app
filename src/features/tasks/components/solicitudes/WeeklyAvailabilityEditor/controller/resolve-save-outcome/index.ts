import saveAvailability from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/save-flow'
import decideSaveOutcome from '../save-decision'
import { SAVE_FAILURE } from '../save-decision/constants'
import type {
  SaveFailureOutcome,
  SaveOutcome,
  SaveOutcomeInput,
} from '../save-decision/types'
import type { ResolveSaveOutcomeInput } from './types'

/** Resolves a save attempt into a SaveOutcome, converting any unexpected rejection into a failure outcome. */
export default async function resolveSaveOutcome(
  { state, onSaved }: ResolveSaveOutcomeInput,
): Promise<SaveOutcome> {
  try {
    const result = await saveAvailability(state)
    const outcomeInput: SaveOutcomeInput = { state, result, onSaved }
    const outcome = decideSaveOutcome(outcomeInput)
    return outcome
  } catch (error) {
    const failureOutcome: SaveFailureOutcome = {
      kind: SAVE_FAILURE,
      state,
      error,
      shouldFocusValidation: false,
    }
    return failureOutcome
  }
}

// Boundary catch keeps the controller's save lifecycle resilient to unexpected rejections.
