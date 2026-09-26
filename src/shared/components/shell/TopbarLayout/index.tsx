import type { ReactNode } from 'react'
import s from './index.module.css'

// Each piece of the topbar and the element it is. The bar is a `header`, so the page has a banner
// landmark; the pieces that sit inside a line of text are spans.
const TAG = {
  bar: 'header',
  lead: 'div',
  menu: 'div',
  heading: 'div',
  title: 'div',
  meta: 'div',
  date: 'span',
  rule: 'span',
  brands: 'span',
  actions: 'div',
  flash: 'div',
  online: 'span',
  wide: 'span',
  narrow: 'span',
} satisfies Record<string, 'header' | 'div' | 'span'>

const NARROW = 'narrow'

type Props = {
  /** Which piece of the topbar this is. `wide` is only for a wide screen (on a phone it is still
   *  read aloud); `narrow` is its phone copy, which is not. */
  part: keyof typeof TAG
  /** The hint a pointer shows over the piece: what a phone copy leaves out. */
  title?: string
  children?: ReactNode
}

export default function TopbarLayout({ part, title, children }: Props) {
  const Tag = TAG[part]
  const hidden = part === NARROW ? true : undefined
  return <Tag className={s[part]} title={title} aria-hidden={hidden}>{children}</Tag>
}

// The layout of the topbar as one element with a skin per piece, like CrashFrame: the Topbar
// only composes components, and every size and the phone breakpoint live in the stylesheet.
