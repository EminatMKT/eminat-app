import type { ReactNode } from 'react'
import s from '@/shared/components/ui/TabBar/index.module.css'

type Props = {
  children: ReactNode
  trailing?: ReactNode
}

/** A section's tab row: the TabButtons go in `children`, and `trailing` sits at its right edge. */
export default function TabBar({ children, trailing }: Props) {
  return (
    <div className={s.bar}>
      <div className={s.tabs}>{children}</div>
      {trailing}
    </div>
  )
}

// The tabs get their own inner row so their gap stays among them and `trailing` is pushed to
// the far end without a second border-bottom drawn under only part of the bar.
