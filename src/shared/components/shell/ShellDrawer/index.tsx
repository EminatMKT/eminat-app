'use client'
import type { ReactNode } from 'react'
import { useT } from '@/shared/i18n'
import { DIALOG } from '@/shared/constants/dom'
import useDialog from '@/shared/components/ui/Modal/useDialog'
import ShellLayout from '@/shared/components/shell/ShellLayout'

type Props = {
  /** The drawer is open over the page. Only the phone's menu button opens it. */
  open: boolean
  onClose: () => void
  /** The sidebar. */
  children: ReactNode
}

export default function ShellDrawer({ open, onClose, children }: Props) {
  const { t } = useT()
  const { box } = useDialog(onClose, open)
  const role = open ? DIALOG : undefined
  const label = open ? t('shell.navigation') : undefined

  return (
    <>
      {open && <ShellLayout part="scrim" onClick={onClose} />}
      <ShellLayout part={open ? 'drawerOpen' : 'drawer'} role={role} label={label} box={box}>{children}</ShellLayout>
    </>
  )
}

// The box the sidebar lives in. On a wide screen it is only a box in the row and never opens. On a
// phone the sidebar folds into it and slides in over the page, behind a scrim — which is a modal,
// so while open it is one: a named dialog that takes the focus, keeps Tab inside, closes on Escape
// and on the scrim, and gives the focus back to the menu button. That behaviour is the one every
// modal has (`useDialog`), not a second copy. The box stays mounted while closed so the sidebar
// keeps its state and its slide; `open` is what turns the dialog on and off.
