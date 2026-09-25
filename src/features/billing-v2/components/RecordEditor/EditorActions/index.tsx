'use client'
import { useT } from '@/shared/i18n'
import { Button } from '@/shared/components/ui'
import DeleteRecord from '../DeleteRecord'
import SaveNotice from '../SaveNotice'

type Props = {
  /** A save is travelling: the save button is disabled until it answers. */
  busy: boolean
  /** Why Save is held back right now —something required is missing, nothing changed—, in words. */
  blocked?: string | null
  /** A write that did not land —refused by the server, or lost on the network—, in words. */
  failure?: string | null
  onCancel: () => void
  onSave: () => void
  /** Only a stored record can be deleted; a new one has nothing to delete. */
  onDelete?: () => Promise<void>
}

export default function EditorActions(props: Props) {
  const { busy, blocked, failure, onCancel, onSave, onDelete } = props
  const { t } = useT()

  return (
    <>
      {failure && <SaveNotice tone="failure">{failure}</SaveNotice>}
      {blocked && <SaveNotice tone="reason">{blocked}</SaveNotice>}
      {onDelete && <DeleteRecord disabled={busy} onConfirm={onDelete} />}
      <Button kind="cancel" onClick={onCancel} />
      <Button kind="confirm" label={t('billing.save')} onClick={onSave} ocupado={busy} deshabilitado={!!blocked} />
    </>
  )
}

// The editor's footer. The deletion brings its own confirmation, so the footer only decides
// whether there is anything to delete: a record that was never stored has nothing to lose.
// Save is disabled while it is held back, with the reason beside it, because an error that can
// be prevented is prevented; the failure of a write belongs to no field, so it is said here,
// next to the action that failed, and not at the end of a form that may be scrolled away.
