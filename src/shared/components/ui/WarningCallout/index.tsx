'use client'
import type { ReactNode } from 'react'
import s from './index.module.css'

// A count with no "which ones" leaves the user nothing to act on, so the detail rides along as
// a native <details>: no state, no effects, keyboard-accessible out of the box.

type Props = {
  /** The warning itself, already translated: this component does not call t(). */
  message: string
  /** The detail. Without it the warning is one fixed line instead of a disclosure. */
  children?: ReactNode
  /** `alert` for a failed action: a `status` mounted with its text is often never announced. */
  role?: 'status' | 'alert'
}

export default function WarningCallout({ message, children, role = 'status' }: Props) {
  if (!children) return <div className={s.aviso} role={role}>{message}</div>

  return (
    <details className={s.caja}>
      <summary className={s.aviso}>{message}</summary>
      <div className={s.detalle}>{children}</div>
    </details>
  )
}

// A warning line, or a warning that opens to show the rows it is about.
