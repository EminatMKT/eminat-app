'use client'
import buildValidationMessage from '../editor-feedback'
import useFocusValidation from '../use-focus-validation'
import type { WeeklyAvailabilityEditorControllerResult } from '../controller/types'
import type { RangeValidationError } from '@/features/tasks/utils/availability'
import type { Translator } from '../types'

type BannerSource = Pick<WeeklyAvailabilityEditorControllerResult, 'validationFocusToken'> & {
  errors: RangeValidationError[]
}

/** The editable editor's validation banner props, or null when there is nothing to show. */
export default function useValidationBanner(source: BannerSource, translate: Translator) {
  const focusRef = useFocusValidation(source.validationFocusToken)
  const message = buildValidationMessage(translate, source.errors)

  if (message == null) return null

  return { message, focusRef }
}

// Always called, win or lose readOnly: index.tsx decides whether to render the result.
