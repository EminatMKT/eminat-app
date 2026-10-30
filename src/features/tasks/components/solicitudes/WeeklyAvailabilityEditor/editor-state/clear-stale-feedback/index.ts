import EDITOR_COPY from '@/features/tasks/components/solicitudes/WeeklyAvailabilityEditor/constants'
import type { SettledFeedback } from './types'

/** A saved/error/validation message from a PAST save goes stale the moment the person edits a
 *  range again: this resets it to idle so EditorActions never shows a result that no longer
 *  applies. An in-flight save is left alone — its own outcome replaces the status shortly. */
export default function clearStaleFeedback(state: SettledFeedback): SettledFeedback {
  if (state.status === EDITOR_COPY.savingStatus) return state

  return { ...state, status: EDITOR_COPY.idleStatus, message: EDITOR_COPY.emptyMessage }
}

// This module keeps editor-state's three transitions from each re-deciding when a save result
// has gone stale; changeRange, addRange, and removeRange all call it before applying the edit.
