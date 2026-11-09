'use client'
import { useState } from 'react'
import { validateRanges } from '@/features/tasks/utils/availability'
import type { EditableRange, LocalEditorState } from '../component-types'
import performSave from './perform-save'
import rangesHaveChanged from './ranges-changed'
import createSaveCycleFacade from './save-cycle'
import type { ControllerState } from './save-cycle/types'
import type { ControllerProps, WeeklyAvailabilityEditorControllerResult } from './types'

const { createInitialControllerState } = createSaveCycleFacade()

/** Owns the weekly availability editor's local state, validation errors, and save lifecycle. */
export default function useWeeklyAvailabilityEditorController(
  props: ControllerProps,
): WeeklyAvailabilityEditorControllerResult {
  const { member, onCancel, onSaved } = props
  const [controllerState, setControllerState] = useState(() => createInitialControllerState(member))
  const { editor, focusToken, savedRanges } = controllerState
  const errors = validateRanges(editor.ranges)
  const isDirty = rangesHaveChanged(savedRanges, editor.ranges)
  const updateEditor = (transform: (previousEditor: LocalEditorState) => LocalEditorState) => {
    const nextState: ControllerState = {
      editor: transform(editor),
      focusToken,
      savedRanges,
    }
    setControllerState(nextState)
  }
  const onChangeRanges = (nextRanges: EditableRange[]) =>
    updateEditor(previousEditor => ({ ...previousEditor, ranges: nextRanges }))
  const performSaveInput = { editor, onSaved, setControllerState }
  const onSave = () => performSave(performSaveInput)
  const result: WeeklyAvailabilityEditorControllerResult = {
    state: editor,
    errors,
    isDirty,
    onChangeRanges,
    onSave,
    onCancel,
    validationFocusToken: focusToken,
  }
  return result
}

// The hook composes pure state and save-cycle units so React only owns re-rendering.
