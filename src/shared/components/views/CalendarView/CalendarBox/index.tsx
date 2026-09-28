import type { ReactNode } from 'react'
import s from './index.module.css'

type Props = {
  /** Which box of a calendar page this one is: the page, its header and the period's name, the
   *  grid, a day, and the entries of a day — folded, or `open` and scrolling. */
  part: 'page' | 'nav' | 'title' | 'grid' | 'day' | 'entries' | 'open'
  children: ReactNode
}

export default function CalendarBox({ part, children }: Props) {
  return <div className={s[part]}>{children}</div>
}

// The layout of the calendar page, as one element with a skin per part. They are the same `<div>`
// and differ only in how they arrange what is inside —a column, a bar, seven tracks, a cell—,
// so one file per part would have been copies of this line plus stylesheets to keep in step.
//
// It exists at all because a view may draw at most two tags before it has to name what it is
// drawing (`markup_dibujado`). Pushing the boxes down here leaves the view above composing
// components only, which is what makes the calendar readable in one screen.
