'use client'
import { useEffect, useRef, useState } from 'react'
import type { BillingV2Record } from '@/shared/data'
import { useT } from '@/shared/i18n'
import recordForm from '../form-state'
import formInput from '../form-input'
import saveBlock from '../save-block'
import visibleErrors from '../visible-errors'
import editorState from '../editor-state'
import type { BillingRecordType, DropRecord, EditField, LeaveField, SaveRecord } from '../types'

/** Takes the focus to the first box of the open dialog that is marked invalid. */
function focusFirstInvalid() {
  document.querySelector<HTMLElement>('[aria-modal="true"] [aria-invalid="true"]')?.focus()
}

/** The editor's boxes, what is wrong with them, why Save is held, and the two writes. */
export default function useRecordEditor(record: BillingV2Record | null, onSave: SaveRecord, onDrop: DropRecord, day?: string) {
  const { t } = useT()
  const [state, setState] = useState(() => editorState.open(recordForm(record, day)))
  const { initial, form, left, attempts, failure, busy } = state
  const inFlight = useRef(false)
  const { input, errors } = formInput(form)
  const blocked = saveBlock(form, initial, t)
  useEffect(() => { if (attempts) focusFirstInvalid() }, [attempts])
  const edit: EditField = (name, value) => setState(editorState.edit(name, value))
  const leave: LeaveField = (name) => setState(editorState.leave(name))
  const pickType = (recordType: BillingRecordType) => setState(editorState.pick(recordType))
  const submit = async () => {
    if (inFlight.current || blocked) return false
    if (!input) {
      setState(editorState.attempted)
      return false
    }
    inFlight.current = true
    setState(editorState.sending)
    const landed = await onSave(record?.id ?? null, input)
    inFlight.current = false
    if (!landed) setState(editorState.failed('billing.saveFailed'))
    return landed
  }
  const drop = async () => {
    const landed = !!record && await onDrop(record.id)
    if (!landed) setState(editorState.failed('billing.deleteFailed'))
    return landed
  }
  const shown = visibleErrors(errors, left, attempts > 0)
  const editor = { form, errors: shown, blocked, failure, busy, edit, leave, pickType, submit, drop }
  return editor
}

// The boxes are validated on every change and the errors are never stored; what is kept is only
// when to show them —a box that was left, or every box after Save met an invalid form—. That
// attempt also takes the focus to the first invalid box, because in a scrolling dialog it may be
// out of view. Save is held —with its reason— while something required is missing or nothing
// changed, so it is never pressed in vain. A write that fails leaves every box as it was and only
// the failure line changes. The ref, and not `busy`, is what stops a double click: two clicks can
// land before React draws the disabled button.
