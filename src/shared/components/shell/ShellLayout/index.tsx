import type { ReactNode } from 'react'
import s from './index.module.css'

// Each piece of the shell and the element it is. Only the page's content is `main`: the topbar sits
// beside it in the column, which is what makes the topbar's `header` the page's banner.
const TAG = {
  root: 'div',
  scrim: 'div',
  column: 'div',
  content: 'main',
} satisfies Record<string, 'div' | 'main'>

type Props = {
  /** Which piece of the shell this is. */
  part: keyof typeof TAG
  /** Only the scrim behind the phone drawer answers a click: it closes the drawer. */
  onClick?: () => void
  children?: ReactNode
}

export default function ShellLayout({ part, onClick, children }: Props) {
  const Tag = TAG[part]
  return <Tag className={s[part]} onClick={onClick}>{children}</Tag>
}

// The layout of AppShell as one element with a skin per piece, like TopbarLayout: AppShell only
// composes components.
