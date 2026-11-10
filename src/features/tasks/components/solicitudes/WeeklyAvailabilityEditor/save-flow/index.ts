import saveOwnAvailability from '@/features/tasks/data/availability/save-own'
import validateRanges from '@/features/tasks/utils/availability/validate-ranges'
import createEditorStateFacade from '../editor-state'
import type {
  SaveFlowFailure,
  SaveFlowResult,
  SaveFlowState,
  SaveFlowSuccess,
  SaveFlowValidation,
} from './types'

const { toSaveRanges } = createEditorStateFacade()

export default async function saveAvailability(
  state: SaveFlowState,
): Promise<SaveFlowResult> {
  const validationErrors = validateRanges(state.ranges)

  if (validationErrors.length > 0) {
    const validationResult: SaveFlowValidation = { errors: validationErrors }

    return validationResult
  }

  try {
    const saveRanges = toSaveRanges(state)
    const response = await saveOwnAvailability(saveRanges)
    const successResult: SaveFlowSuccess = { response }

    return successResult
  } catch (error) {
    const failureResult: SaveFlowFailure = { error }

    return failureResult
  }
}

// This facade validates current editable ranges before delegating the caller-owned save flow.
