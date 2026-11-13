'use client'
import { Modal } from '@/shared/components/ui'
import { DISCARD_MODAL_COPY } from './constants'
import Actions from './discard-actions'
import useDialogView from './use-dialog-view'
import type { Props } from './types'

export default function DiscardChangesModal(props: Props) {
  const { close, t } = useDialogView(props)
  const footer = Actions(props, t)

  return (
    <Modal title={t(DISCARD_MODAL_COPY.title)} role="alertdialog" onClose={close} footer={footer}>
      {t(DISCARD_MODAL_COPY.message)}
    </Modal>
  )
}

// Composes the dialog's title, message, and action footer through the shared Modal shell.
