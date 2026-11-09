import resolveSaveOutcome from '../resolve-save-outcome'
import { SAVE_SUCCESS } from '../save-decision/constants'
import createSaveCycleFacade from '../save-cycle'
import type { PerformSaveInput } from './types'

const { buildSavingState, buildFailureState, applyOutcome } = createSaveCycleFacade()

async function runSaveAttempt(input: PerformSaveInput): Promise<boolean> {
  const resolveInput = { state: input.editor, onSaved: input.onSaved }
  const outcome = await resolveSaveOutcome(resolveInput)

  if (outcome.kind === SAVE_SUCCESS) outcome.onSaved(outcome.response)
  input.setControllerState(previous => applyOutcome(previous, outcome))

  return outcome.kind === SAVE_SUCCESS
}

function markSaveFailed(input: PerformSaveInput): boolean {
  input.setControllerState(buildFailureState)

  return false
}

/** Runs one save attempt end to end: flips the editor to "saving", resolves the outcome,
 *  notifies the caller on success, and folds the result into controller state. Resolves to
 *  whether the save succeeded, so callers can branch without the promise ever rejecting. */
export default async function performSave(input: PerformSaveInput): Promise<boolean> {
  try {
    input.setControllerState(buildSavingState)

    return await runSaveAttempt(input)
  } catch {
    return markSaveFailed(input)
  }
}

// Each step got its own name so this orchestration body stays short and readable end to end.
