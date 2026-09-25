'use client'
import { useT } from '@/shared/i18n'
import { Button } from '@/shared/components/ui'
import DeleteRecord from '../DeleteRecord'

type Props = {
  /** A save is travelling: the save button is disabled until it answers. */
  busy: boolean
  onCancel: () => void
  onSave: () => void
  /** Only a stored record can be deleted; a new one has nothing to delete. */
  onDelete?: () => Promise<void>
}

export default function EditorActions({ busy, onCancel, onSave, onDelete }: Props) {
  const { t } = useT()

  return (
    <>
      {onDelete && <DeleteRecord disabled={busy} onConfirm={onDelete} />}
      <Button kind="cancel" onClick={onCancel} />
      <Button kind="confirm" label={t('billing.save')} onClick={onSave} ocupado={busy} />
    </>
  )
}

// The editor's footer. The deletion brings its own confirmation, so the footer only decides
// whether there is anything to delete: a record that was never stored has nothing to lose.
