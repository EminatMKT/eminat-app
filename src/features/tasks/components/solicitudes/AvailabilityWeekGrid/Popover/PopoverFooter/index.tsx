'use client'
import { useState } from 'react'
import { useT } from '@/shared/i18n'
import { Button, ConfirmModal } from '@/shared/components/ui'
import type { PopoverFooterProps, SimpleTranslator } from './types'

const COMMON_DELETE_KEY = 'common.delete'

function deleteCopy(t: SimpleTranslator, confirmationMessage: string) {
  const title = t(COMMON_DELETE_KEY)

  return { title, message: confirmationMessage, confirmLabel: title }
}

function deleteActions(onRemove: () => void, onClose: () => void) {
  return { destructive: true, onConfirm: onRemove, onClose }
}

function useDeleteConfirm(t: SimpleTranslator, confirmationMessage: string, onRemove: () => void) {
  const [asking, setAsking] = useState(false)
  const open = () => setAsking(true)
  const close = () => setAsking(false)
  const copy = deleteCopy(t, confirmationMessage)
  const actions = deleteActions(onRemove, close)
  const node = asking && <ConfirmModal {...copy} {...actions} />

  return { open, node }
}

/** The two destructive/committing actions a Popover offers while it is editable: delete (guarded
 *  by this file's own `ConfirmModal`) and confirm (disabled until the draft is safe to save). */
export default function PopoverFooter(props: PopoverFooterProps) {
  const { confirmationMessage, onRemove } = props
  const { open, node } = useDeleteConfirm(useT().t, confirmationMessage, onRemove)

  return <>
    <Button kind="delete" onClick={open} />
    <Button kind="confirm" onClick={props.onSave} deshabilitado={!props.canSave} />
    {node}
  </>
}

// PopoverFooter renders its own ConfirmModal for the delete action instead of calling
// confirm-removal/'s window.confirm: a literal `kind="delete"` Button in this file's JSX trips
// this repo's ui.md rule requiring a ConfirmModal in the same file, with no iconOnly escape.
