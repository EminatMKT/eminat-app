'use client'
import type { ReactNode } from 'react'
import s from './index.module.css'

type Props = {
  /** What a screen reader announces. It is required because the content of a surface —a glyph,
   *  a number, a card— usually does not name it on its own. */
  accessibleLabel: string
  onClick: () => void
  /** The look, from the view that owns it. This primitive only brings the reset and the ring. */
  className?: string
  children: ReactNode
}

export default function Pressable({ accessibleLabel, onClick, className, children }: Props) {
  return (
    <button type="button" onClick={onClick} aria-label={accessibleLabel}
      className={`${s.surface} ${className ?? ''}`}>
      {children}
    </button>
  )
}

// A button that is a SURFACE and not an action: a day of a calendar, a record sitting on it, a
// step arrow, a row that opens. `Button` answers "what does this do" — it brings the icon, the
// default label and the tone of `BUTTON_META`, and giving that padding to a whole cell breaks it.
// This one answers "what is this": the content belongs to the caller and all that is shared is
// that the thing is in the tab order, answers Enter and shows where the focus landed.
//
// The label is a prop and not the text inside because the two differ on every surface that draws
// a number or a symbol. `PillToggle` — the closest relative — takes `label: string` and paints it
// itself, which is exactly what a surface cannot do.
