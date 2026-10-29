import type {
  SaveFailureKind,
  SaveSuccessKind,
  ValidationFailureKind,
} from './types'

export const VALIDATION_FAILURE: ValidationFailureKind = 'validation-failure'
export const SAVE_SUCCESS: SaveSuccessKind = 'save-success'
export const SAVE_FAILURE: SaveFailureKind = 'save-failure'
