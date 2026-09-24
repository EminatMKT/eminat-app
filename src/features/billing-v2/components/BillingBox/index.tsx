import type { ReactNode } from 'react'
import s from './index.module.css'

const TITLE = 'title'

type Props = {
  /** Which piece of the billing screen this box is. */
  part: 'page' | 'head' | 'title' | 'seam' | 'records' | 'form' | 'row' | 'pills' | 'hint'
  children: ReactNode
}

export default function BillingBox({ part, children }: Props) {
  if (part === TITLE) return <h2 className={s.title}>{children}</h2>
  return <div className={s[part]}>{children}</div>
}

// The layout of the billing screen, as one element with a skin per piece. They are the same box
// and differ only in how they arrange what is inside, so nine files would have been nine copies
// of this line plus nine stylesheets to keep in step.
//
// It exists because a view may draw at most two tags before it has to name what it is drawing
// (`markup_dibujado`). Pushing the boxes down here leaves every view above composing components
// only. The screen's name is the one piece that is not a `<div>`: a heading has to be a heading.
