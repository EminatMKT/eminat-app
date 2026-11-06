'use client'
import { useState } from 'react'
import { validateRanges } from '@/features/tasks/utils/availability'
import type { EditableRange, LocalEditorState } from '../component-types'
import resolveSaveOutcome from './resolve-save-outcome'
import { SAVE_SUCCESS } from './save-decision/constants'
import createSaveCycleFacade from './save-cycle'
import type { ControllerState } from './save-cycle/types'
import type { ControllerProps, WeeklyAvailabilityEditorControllerResult } from './types'

const {
  createInitialControllerState,
  buildSavingState,
  buildFailureState,
  applyOutcome,
} = createSaveCycleFacade()

/** Owns the weekly availability editor's local state, validation errors, and save lifecycle. */
export default function useWeeklyAvailabilityEditorController(
  props: ControllerProps,
): WeeklyAvailabilityEditorControllerResult {
  const { member, onCancel, onSaved } = props
  const [controllerState, setControllerState] = useState(() => createInitialControllerState(member))
  const { editor, focusToken } = controllerState
  const errors = validateRanges(editor.ranges)
  const updateEditor = (transform: (previousEditor: LocalEditorState) => LocalEditorState) => {
    const nextState: ControllerState = { editor: transform(editor), focusToken }
    setControllerState(nextState)
  }
  const onChangeRanges = (nextRanges: EditableRange[]) =>
    updateEditor(previousEditor => ({ ...previousEditor, ranges: nextRanges }))
  const onSave = async () => {
    setControllerState(buildSavingState)
    try {
      const resolveInput = { state: editor, onSaved }
      const outcome = await resolveSaveOutcome(resolveInput)
      // onSaved runs here, in the async body, never inside the setState updater below: an
      // updater can rerun under Strict Mode, and a throw inside it escapes this try/catch.
      if (outcome.kind === SAVE_SUCCESS) outcome.onSaved(outcome.response)
      // applyOutcome sets EDITOR_COPY.saved/savedStatus or EDITOR_COPY.validationError: the
      // success or recovery text EditorActions announces to the user from state.message.
      setControllerState(previous => applyOutcome(previous, outcome))
    } catch {
      // buildFailureState sets EDITOR_COPY.errorStatus/saveError: the recovery text
      // EditorActions announces when the save request itself throws unexpectedly.
      setControllerState(buildFailureState)
    }
  }
  const result: WeeklyAvailabilityEditorControllerResult = {
    state: editor,
    errors,
    onChangeRanges,
    onSave,
    onCancel,
    validationFocusToken: focusToken,
  }
  return result
}

// The hook composes pure state and save-cycle units so React only owns re-rendering.
