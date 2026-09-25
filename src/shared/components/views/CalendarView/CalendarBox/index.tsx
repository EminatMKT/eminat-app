import type { ReactNode } from 'react'
import s from './index.module.css'

type Props = {
  /** Which of the four boxes of a month page this one is. */
  part: 'page' | 'nav' | 'grid' | 'day'
  children: ReactNode
}

export default function CalendarBox({ part, children }: Props) {
  return <div className={s[part]}>{children}</div>
}

// The layout of the month page, as one element with four skins. The four are the same `<div>`
// and differ only in how they arrange what is inside —a column, a bar, seven tracks, a cell—,
// so four files would have been four copies of this line plus four stylesheets to keep in step.
//
// It exists at all because a view may draw at most two tags before it has to name what it is
// drawing (`markup_dibujado`). Pushing the boxes down here leaves the view above composing
// components only, which is what makes the calendar readable in one screen.
