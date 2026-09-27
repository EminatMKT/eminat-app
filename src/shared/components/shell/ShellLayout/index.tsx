import type { ComponentPropsWithRef, ReactNode } from 'react'
import type { DIALOG } from '@/shared/constants/dom'
import s from './index.module.css'

// Each piece of the shell and the element it is. Only the page's content is `main`: the topbar sits
// beside it in the column, which is what makes the topbar's `header` the page's banner.
const TAG = {
  root: 'div',
  scrim: 'div',
  drawer: 'div',
  drawerOpen: 'div',
  column: 'div',
  content: 'main',
} satisfies Record<string, 'div' | 'main'>

type Props = {
  /** Which piece of the shell this is. */
  part: keyof typeof TAG
  /** Only the scrim behind the phone drawer answers a click: it closes the drawer. */
  onClick?: () => void
  /** The drawer while it is open on a phone: a modal dialog. */
  role?: typeof DIALOG
  /** The dialog's name: it has no visible title to point at. */
  label?: string
  /** What `useDialog` hands the drawer: its ref, and while open the focus and the keys. */
  box?: ComponentPropsWithRef<'div'>
  children?: ReactNode
}

export default function ShellLayout(props: Props) {
  const { part, onClick, role, label, box, children } = props
  const Tag = TAG[part]
  return <Tag {...box} role={role} aria-label={label} className={s[part]} onClick={onClick}>{children}</Tag>
}

// The layout of AppShell as one element with a skin per piece, like TopbarLayout: AppShell only
// composes components. The drawer is the sidebar's box: on a wide screen it only sits in the row,
// and on a phone it slides in over the page, where —open— it is the dialog ShellDrawer makes it.
