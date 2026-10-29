import { createElement } from 'react'
import EDITOR_COPY from '../constants'
import EditorActions from '../EditorActions'
import type { EditorFeedback, EditorFeedbackInput } from './types'

const PARAGRAPH_TAG = 'p'
const NO_PARAGRAPH_PROPS = null

/** Builds the weekly summary text, the validation banner message, and the save/cancel actions. */
export default function buildEditorFeedback(input: EditorFeedbackInput): EditorFeedback {
  const { translate, declaredHours, hasValidationErrors, status, message, onCancel, onSave } = input
  const weeklyHoursVars = { hours: declaredHours }
  const weeklySummary = createElement(PARAGRAPH_TAG, NO_PARAGRAPH_PROPS, translate(EDITOR_COPY.weeklyHoursKey, weeklyHoursVars))
  const validationCopy = translate(EDITOR_COPY.validationError)
  const validationMessage = hasValidationErrors ? validationCopy : null
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
