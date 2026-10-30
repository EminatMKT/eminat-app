import { createElement } from 'react'
import { countInvalidRanges } from '@/features/tasks/utils/availability'
import EDITOR_COPY from '../constants'
import EditorActions from '../EditorActions'
import { NO_INVALID_RANGES, VALIDATION_SUMMARY_KEY } from './constants'
import type { EditorFeedback, EditorFeedbackInput } from './types'

const PARAGRAPH_TAG = 'p'
const NO_PARAGRAPH_PROPS = null

/** Builds the weekly summary text, the validation banner message, and the save/cancel actions.
 *  The banner reports a COUNT of invalid ranges (distinct `rangeIndex` values), never the
 *  per-range sentence AvailabilityRangeItem already shows: the same problem is not restated. */
export default function buildEditorFeedback(input: EditorFeedbackInput): EditorFeedback {
  const { translate, declaredHours, errors, status, message, onCancel, onSave } = input
  const weeklyHoursVars = { hours: declaredHours }
  const weeklyHoursCopy = translate(EDITOR_COPY.weeklyHoursKey, weeklyHoursVars)
  const weeklySummary = createElement(PARAGRAPH_TAG, NO_PARAGRAPH_PROPS, weeklyHoursCopy)
  const invalidRangeCount = countInvalidRanges(errors)
  const summaryVars = { count: invalidRangeCount }
  const validationMessage = invalidRangeCount > NO_INVALID_RANGES
    ? translate(VALIDATION_SUMMARY_KEY, summaryVars)
    : null
  const handleSave = () => void onSave()
  const actionsProps = {
    status,
    message,
    onCancel,
    onSave: handleSave,
  }
  const actions = createElement(EditorActions, actionsProps)

  const feedback: EditorFeedback = { weeklySummary, validationMessage, actions }
  return feedback
}

// Isolated from index.tsx so the top-level component stays within the file's line ceiling.
