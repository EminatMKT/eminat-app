import type { ReactNode } from 'react'
import s from './index.module.css'

type Props = { children: ReactNode }

export default function ActionStrip({ children }: Props) {
  return <div className={s.strip}>{children}</div>
}

// The box a form's footer is laid out in. It is its own piece so the footer above it composes
// components only: a view may draw at most two tags before it has to name what it is drawing.
