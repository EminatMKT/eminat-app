'use client'
import { useEffect, useRef, type ReactNode } from 'react'
import s from './index.module.css'

const FAILURE = 'failure'

type Props = {
  /** `reason`: why Save is disabled right now. `failure`: a write that did not land. */
  tone: 'reason' | 'failure'
  children: ReactNode
}

export default function SaveStatus({ tone, children }: Props) {
  const box = useRef<HTMLParagraphElement>(null)
  const failure = tone === FAILURE
  useEffect(() => { if (failure) box.current?.focus() }, [failure])
  return (
    <p ref={box} role={failure ? 'alert' : 'status'} tabIndex={failure ? -1 : undefined}
      className={`${s.notice} ${s[tone]}`}>
      {children}
    </p>
  )
}

// The one line of a form's footer for what belongs to no field, next to the action it is about.
// A field's message goes under its own box; this line says either why Save is disabled —in view,
// not in a tooltip, because a disabled button that does not say why reads as a broken one— or
// that a write the server refused or the network dropped did not land. The failure takes the
// focus when it appears, so a keyboard or screen-reader user is standing on the answer.
