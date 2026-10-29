import type { ReactElement } from 'react'
import type { EditorStatus, Translator } from '../types'

/** Everything buildEditorFeedback needs to translate the summary and wire the save/cancel actions. */
export type EditorFeedbackInput = {
  translate: Translator
  declaredHours: number
  hasValidationErrors: boolean
  status: EditorStatus
  message: string | null
  onCancel: () => void
  onSave: () => Promise<void>
}

/** The weekly summary text, the validation banner message, and the save/cancel actions element. */
export type EditorFeedback = {
  weeklySummary: ReactElement
  validationMessage: string | null
  actions: ReactElement
}
