'use client'
import { useState } from 'react'
import { useT } from '@/shared/i18n'
import { Button, ConfirmModal } from '@/shared/components/ui'

type Props = {
  disabled: boolean
  /** The deletion itself. The row stays on screen unless it answers that it landed. */
  onConfirm: () => Promise<void>
}

export default function DeleteRecord({ disabled, onConfirm }: Props) {
  const { t } = useT()
  const [asking, setAsking] = useState(false)

  const confirm = async () => {
    await onConfirm()
    setAsking(false)
  }

  return (
    <>
      <Button kind="delete" onClick={() => setAsking(true)} deshabilitado={disabled} />
      {asking && (
        <ConfirmModal destructive title={t('billing.deleteTitle')} message={t('billing.deleteMsg')}
          confirmLabel={t('common.delete')} onConfirm={confirm} onClose={() => setAsking(false)} />
      )}
    </>
  )
}

// The bin and its question live together, so no path offers the deletion without asking first.
// It is red and says it cannot be undone: a stored payment removed by mistake takes its history
// with it. Cancelling closes the question and touches nothing.
