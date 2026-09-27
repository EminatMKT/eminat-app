'use client'
import type { BillingV2Record } from '@/shared/data'
import { useT, type I18nKey } from '@/shared/i18n'
import { Modal, SaveActions } from '@/shared/components/ui'
import fieldSpecs from './field-specs'
import useRecordEditor from './useRecordEditor'
import TypePicker from './TypePicker'
import RecordField from './RecordField'
import DeleteRecord from './DeleteRecord'
import type { DropRecord, SaveRecord } from './types'

type Props = {
  /** The stored record to edit, or null to create one. */
  record: BillingV2Record | null
  /** The calendar day a new record was started from; ignored when editing a stored one. */
  day?: string
  onSave: SaveRecord
  onDrop: DropRecord
  /** A write landed and the editor is closing: what to confirm, in a key. */
  onLanded?: (said: I18nKey) => void
  onClose: () => void
}

export default function RecordEditor(props: Props) {
  const { record, day, onSave, onDrop, onLanded, onClose } = props
  const { t } = useT()
  const editor = useRecordEditor(record, onSave, onDrop, day)
  const { form, errors, shown, fields, hold, failure, busy, edit, leave, pickType } = editor
  const landed = (said: I18nKey) => { onLanded?.(said); onClose() }
  const save = async () => { if (await editor.submit()) landed('billing.saved') }
  const remove = async () => { if (await editor.drop()) landed('billing.deleted') }
  const actions = (
    <SaveActions errors={errors} fields={fields} busy={busy} hold={hold} failure={failure && t(failure)}
      saveLabel={t('billing.save')} onCancel={onClose} onSave={() => void save()}>
      {record && <DeleteRecord disabled={busy} onConfirm={remove} />}
    </SaveActions>
  )

  return (
    <Modal title={t(record ? 'billing.editorEdit' : 'billing.editorNew')} footer={actions} onClose={onClose}>
      <TypePicker current={form.recordType} locked={!!record} onPick={pickType} />
      {fieldSpecs(form.recordType).map((spec) => (
        <RecordField key={spec.name} spec={spec} form={form} error={shown[spec.name]} onEdit={edit} onLeave={leave} />
      ))}
    </Modal>
  )
}

// Creates and edits the three kinds of billing record through one form described as data. Each
// field's message is drawn under its own box, by the field; what belongs to no field —why Save is
// held, a write that did not land— is said in the footer beside the actions, always in view.
// The footer is the shared `SaveActions`, handed every error and not only the shown ones: it is
// what holds Save while any is unresolved, and the editor only adds its «nothing changed» on top.
// The deletion brings its own confirmation; a record that was never stored has nothing to delete.
// The modal only closes when a write answers that it landed: a refused or failed save keeps every
// box as it was typed, and a failed deletion keeps the record. One that landed is confirmed by
// the screen around it (`onLanded`), since the modal that could say so is closing.
