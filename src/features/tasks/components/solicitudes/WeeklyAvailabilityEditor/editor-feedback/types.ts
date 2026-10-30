import type { ReactElement } from 'react'
import type { I18nKey } from '@/shared/i18n'
import type { RangeValidationError } from '@/features/tasks/utils/availability'
import type { EditorStatus, Translator } from '../types'

/** Everything buildEditorFeedback needs to translate the summary and wire the save/cancel actions.
 *  `errors` (not a precomputed boolean) lets the banner report HOW MANY ranges are invalid. */
export type EditorFeedbackInput = {
  translate: Translator
  declaredHours: number
  errors: RangeValidationError[]
  status: EditorStatus
  message: I18nKey | null
  onCancel: () => void
  onSave: () => Promise<void>
}

/** The weekly summary text, the validation banner message, and the save/cancel actions element. */
export type EditorFeedback = {
  weeklySummary: ReactElement
  validationMessage: string | null
  actions: ReactElement
}
