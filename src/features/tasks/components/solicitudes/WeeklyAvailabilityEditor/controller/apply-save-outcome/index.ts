import EDITOR_COPY from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import { SAVE_SUCCESS, VALIDATION_FAILURE } from '../save-decision/constants'
import type { SaveOutcome } from '../save-decision/types'
import type { ApplySaveOutcomeResult } from './types'

/** Maps a resolved save outcome to its status/message feedback and whether validation focus should
 *  move. Never touches `ranges` (the caller merges this onto the LIVE editor state) and never calls
 *  `outcome.onSaved` — that side effect belongs to the caller's async body, not a `setState` updater. */
export default function applySaveOutcome(outcome: SaveOutcome): ApplySaveOutcomeResult {
  if (outcome.kind === VALIDATION_FAILURE) {
    return { status: EDITOR_COPY.idleStatus, message: EDITOR_COPY.validationError, shouldBumpFocusToken: true }
  }
  if (outcome.kind === SAVE_SUCCESS) {
    return { status: EDITOR_COPY.savedStatus, message: EDITOR_COPY.saved, shouldBumpFocusToken: false }
  }
  return { status: EDITOR_COPY.errorStatus, message: EDITOR_COPY.saveError, shouldBumpFocusToken: false }
}

// Pure mapping keeps every save-outcome branch testable without rendering React state.
