'use client'
import useLocalDraft from './local-draft'
import deriveDraftValidation from './draft-validation'
import type { PopoverControllerProps } from './types'

export type { PopoverControllerResult } from './types'

/** Composes the local draft and its derived validation into the one result Popover's component
 *  reads: the draft, whether it is safe to save, and the save/remove handlers it wires to UI. */
export default function usePopoverController(props: PopoverControllerProps) {
  const { range, onSave, onRemove } = props
  const localDraft = useLocalDraft(range)
  const validation = deriveDraftValidation(props, localDraft.draft)
  const save = () => validation.canSave && onSave(range.clientId, localDraft.draft)
  const actions = { save, remove: () => onRemove(range.clientId) }
  const result = { ...localDraft, ...validation, ...actions }

  return result
}

// Stays a thin composition; local-draft/ and draft-validation/ own their tested behavior so this
// file's only job is wiring, within this repo's ten-line function budget.
