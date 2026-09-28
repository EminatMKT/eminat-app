import type { ReactNode } from 'react'
import { HEADING } from '@/shared/constants/dom'
import s from './index.module.css'

const SCREEN = 'screen'
const ALERT = 'alert'

type Props = {
  /** Which piece of the crash screen this frame is. */
  part: 'screen' | 'heading' | 'text'
  children: ReactNode
}

export default function CrashFrame({ part, children }: Props) {
  if (part === HEADING) return <h1 className={s.heading}>{children}</h1>
  const role = part === SCREEN ? ALERT : undefined
  return <div className={s[part]} role={role}>{children}</div>
}

// The layout of the crash screen, as one element with a skin per piece, so the screen above it
// only composes components (`markup_dibujado`). The heading is the one piece that is not a box.
