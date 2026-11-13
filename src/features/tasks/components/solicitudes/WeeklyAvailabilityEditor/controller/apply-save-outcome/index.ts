import { EDITOR_COPY }
  from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import { SAVE_FAILURE, SAVE_SUCCESS, VALIDATION_FAILURE } from '../constants'
import type {
  SaveFailureKind,
  SaveOutcome,
  SaveSuccessKind,
  ValidationFailureKind,
} from '../save-decision/types'
import type { ApplySaveOutcomeResult } from './types'

type OutcomeKind = ValidationFailureKind | SaveSuccessKind | SaveFailureKind

/** The feedback each outcome kind settles on: only a validation failure moves the focus. */
const FEEDBACK_BY_KIND: Record<OutcomeKind, ApplySaveOutcomeResult> = {
  [VALIDATION_FAILURE]: {
    status: EDITOR_COPY.idleStatus,
    message: EDITOR_COPY.validationError,
    shouldBumpFocusToken: true,
  },
  [SAVE_SUCCESS]: {
    status: EDITOR_COPY.savedStatus,
    message: EDITOR_COPY.saved,
    shouldBumpFocusToken: false,
  },
  [SAVE_FAILURE]: {
    status: EDITOR_COPY.errorStatus,
    message: EDITOR_COPY.saveError,
    shouldBumpFocusToken: false,
  },
}

/** Maps a resolved save outcome to its feedback. Never touches `ranges` (the caller merges this
 *  onto the LIVE editor state) and never calls `outcome.onSaved`: that side effect belongs to the
 *  caller's async body, not a `setState` updater. */
export default function applySaveOutcome(outcome: SaveOutcome): ApplySaveOutcomeResult {
  const feedback = { ...FEEDBACK_BY_KIND[outcome.kind] }

  return feedback
}

// Pure mapping keeps every save-outcome branch testable without rendering React state.
