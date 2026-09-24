'use client'
import { useRef, useState } from 'react'
import type { BillingV2Record } from '@/shared/data'
import type { I18nKey } from '@/shared/i18n'
import recordForm from '../form-state'
import formInput from '../form-input'
import type { BillingRecordType, DropRecord, EditField, RecordForm, SaveRecord } from '../types'

type EditorState = { form: RecordForm; errors: I18nKey[]; busy: boolean }

/** The editor's boxes, what is wrong with them, and the two writes they can ask for. */
export default function useRecordEditor(record: BillingV2Record | null, onSave: SaveRecord, onDrop: DropRecord) {
  const [state, setState] = useState<EditorState>(() => ({ form: recordForm(record), errors: [], busy: false }))
  const { form, errors, busy } = state
  const inFlight = useRef(false)

  const edit: EditField = (name, value) => setState((s) => ({ ...s, form: { ...s.form, [name]: value } }))
  const pickType = (recordType: BillingRecordType) => setState((s) => ({ ...s, form: { ...s.form, recordType } }))

  const submit = async () => {
    if (inFlight.current) return false
    const { input, errors: found } = formInput(form)
    if (!input) {
      setState((s) => ({ ...s, errors: found }))
      return false
    }
    inFlight.current = true
    setState((s) => ({ ...s, busy: true, errors: [] }))
    const landed = await onSave(record?.id ?? null, input)
    inFlight.current = false
    if (!landed) setState((s) => ({ ...s, busy: false, errors: ['billing.saveFailed'] }))
    return landed
  }

  const drop = async () => {
    const landed = !!record && await onDrop(record.id)
    if (!landed) setState((s) => ({ ...s, errors: ['billing.deleteFailed'] }))
    return landed
  }

  const editor = { form, errors, busy, edit, pickType, submit, drop }
  return editor
}

// The form's whole life in one state object: the boxes, the reasons they were refused, and
// whether a save is travelling. A refused form never reaches the network, and a save the server
// refused leaves every box as it was — only the error line changes. The ref, and not the `busy`
// flag, is what stops a double click: two clicks can land before React draws the disabled button.
