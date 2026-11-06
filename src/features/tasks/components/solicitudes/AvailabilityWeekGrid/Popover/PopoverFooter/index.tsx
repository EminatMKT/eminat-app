'use client'
import { useState } from 'react'
import { useT } from '@/shared/i18n'
import { Button, ConfirmModal } from '@/shared/components/ui'
import type { PopoverFooterProps, SimpleTranslator } from './types'
import s from './index.module.css'

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
function primaryActions(open: () => void, onSave: () => void, canSave: boolean) {
  return <>
    <div className={s.delete}><Button kind="delete" onClick={open} /></div>
    <Button kind="confirm" onClick={onSave} deshabilitado={!canSave} />
  </>
}

/** The three actions a Popover footer offers while editable: cancel, guarded delete, confirm. */
export default function PopoverFooter(props: PopoverFooterProps) {
  const { confirmationMessage, onRemove, onCancel } = props
  const { open, node } = useDeleteConfirm(useT().t, confirmationMessage, onRemove)

  return <>
    <Button kind="cancel" onClick={onCancel} />
    {primaryActions(open, props.onSave, props.canSave)}
    {node}
  </>
}

// PopoverFooter renders its own ConfirmModal for the delete action instead of calling
// confirm-removal/'s window.confirm: a literal `kind="delete"` Button in this file's JSX trips
// this repo's ui.md rule requiring a ConfirmModal in the same file, with no iconOnly escape.

// The delete button's `.delete` wrapper pushes it to the far left of the shared Modal footer's
// flex-end row, isolating the destructive action per ihc.md's "the destructive one, far away".
