import type { AvailabilityResponse } from '@/features/tasks/data/availability/types'
import type { RangeValidationError } from '@/features/tasks/utils/availability'
import type { LocalEditorState } from '../component-types/types'

/** The editable state and ranges required to validate and save the caller's availability. */
export type SaveFlowState = Pick<
  LocalEditorState,
  'ranges' | 'status' | 'message' | 'pendingRemoval'
>

/** The result returned after a valid availability save completes. */
export type SaveFlowSuccess = {
  response: AvailabilityResponse
}

/** The result returned when the editable ranges fail validation. */
export type SaveFlowValidation = {
  errors: RangeValidationError[]
}

/** The result returned when the existing save operation fails. */
export type SaveFlowFailure = {
  error: unknown
}

export type SaveFlowResult = SaveFlowSuccess | SaveFlowValidation | SaveFlowFailure
