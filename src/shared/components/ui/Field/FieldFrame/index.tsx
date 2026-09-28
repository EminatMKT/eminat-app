import type { ReactNode } from 'react'
import s from '../index.module.css'

type Props = {
  /** Extra classes for the variants (`grande`, `crece`). */
  className?: string
  errorId: string
  /** Why the value is not accepted. Drawn only while there is one. */
  error?: string
  children: ReactNode
}

export default function FieldFrame({ className = '', errorId, error, children }: Props) {
  return (
    <div className={`${s.campo} ${className}`}>
      {children}
      {error && <p id={errorId} className={s.error}>{error}</p>}
    </div>
  )
}

// The box of a Field and the error slot at its bottom. The error goes right under its own
// control and not in a list at the end of the form: that is where the eye is when it appears.
