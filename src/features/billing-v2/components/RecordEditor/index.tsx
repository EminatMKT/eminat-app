'use client'
import type { BillingV2Record } from '@/shared/data'
import { useT } from '@/shared/i18n'
import { Modal } from '@/shared/components/ui'
import fieldSpecs from './field-specs'
import useRecordEditor from './useRecordEditor'
import TypePicker from './TypePicker'
import RecordField from './RecordField'
import EditorActions from './EditorActions'
import type { DropRecord, SaveRecord } from './types'

type Props = {
  /** The stored record to edit, or null to create one. */
  record: BillingV2Record | null
  /** The calendar day a new record was started from; ignored when editing a stored one. */
  day?: string
  onSave: SaveRecord
  onDrop: DropRecord
  onClose: () => void
}

export default function RecordEditor(props: Props) {
  const { record, day, onSave, onDrop, onClose } = props
  const { t } = useT()
  const editor = useRecordEditor(record, onSave, onDrop, day)
  const { form, errors, blocked, failure, busy, edit, leave, pickType } = editor
  const save = async () => { if (await editor.submit()) onClose() }
  const remove = async () => { if (await editor.drop()) onClose() }
  const actions = <EditorActions busy={busy} blocked={blocked} failure={failure && t(failure)} onCancel={onClose}
    onSave={() => void save()} onDelete={record ? remove : undefined} />

  return (
    <Modal title={t(record ? 'billing.editorEdit' : 'billing.editorNew')} footer={actions} onClose={onClose}>
      <TypePicker current={form.recordType} locked={!!record} onPick={pickType} />
      {fieldSpecs(form.recordType).map((spec) => (
        <RecordField key={spec.name} spec={spec} form={form} error={errors[spec.name]} onEdit={edit} onLeave={leave} />
      ))}
    </Modal>
  )
}

// Creates and edits the three kinds of billing record through one form described as data. Each
// field's message is drawn under its own box, by the field; what belongs to no field —why Save is
// held, a write that did not land— is said in the footer beside the actions, always in view.
// The modal only closes when a write answers that it landed: a refused or failed save keeps every
// box as it was typed, and a failed deletion keeps the record.
