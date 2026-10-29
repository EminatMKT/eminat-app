'use client'
import { createElement, useEffect, useRef } from 'react'
import type { ReactElement } from 'react'
import { useT } from '@/shared/i18n'
import EDITOR_COPY from './constants'
import useWeeklyAvailabilityEditorController from './controller'
import buildDayElements from './day-elements'
import type { DayElementsInput } from './day-elements/types'
import buildEditorFeedback from './editor-feedback'
import type { EditorFeedbackInput } from './editor-feedback/types'
import type { EditorProps } from './types'
import WeeklyAvailabilityEditorComposition from './WeeklyAvailabilityEditorComposition'
import type { WeeklyAvailabilityEditorCompositionProps } from './WeeklyAvailabilityEditorComposition/types'

const UNFOCUSED_TOKEN = 0

/** Composes the weekly availability editor's lifecycle, seven day sections, and save actions. */
export default function WeeklyAvailabilityEditor(props: EditorProps): ReactElement {
  const { t } = useT()
  const validationFocusRef = useRef<HTMLDivElement>(null)
  const controller = useWeeklyAvailabilityEditorController(props)
  const { state, viewModel, errors, onChangeRange, onAddRange, onRemoveRange, onSave, onCancel, validationFocusToken } = controller
  const focusValidationMessage = () => validationFocusRef.current?.focus()
  useEffect(() => {
    if (validationFocusToken > UNFOCUSED_TOKEN) focusValidationMessage()
  }, [validationFocusToken])
  const dayElementsInput: DayElementsInput = {
    viewModel,
    translate: t,
    onChangeRange,
    onAddRange,
    onRemoveRange,
  }
  const { monday, tuesday, wednesday, thursday, friday, saturday, sunday } = buildDayElements(dayElementsInput)
  const feedbackInput: EditorFeedbackInput = {
    translate: t,
    declaredHours: viewModel.weeklySummary.declaredHours,
    hasValidationErrors: errors.length > EDITOR_COPY.zeroHours,
    status: state.status,
    message: state.message,
    onCancel,
    onSave,
  }
  const { weeklySummary, validationMessage, actions } = buildEditorFeedback(feedbackInput)
  const compositionProps: WeeklyAvailabilityEditorCompositionProps = {
    monday,
    tuesday,
    wednesday,
    thursday,
    friday,
    saturday,
    sunday,
    weeklySummary,
    validationMessage,
    validationFocusRef,
    actions,
  }
  return createElement(WeeklyAvailabilityEditorComposition, compositionProps)
}

// This component only wires the controller hook to its two child composers; no local state here.
