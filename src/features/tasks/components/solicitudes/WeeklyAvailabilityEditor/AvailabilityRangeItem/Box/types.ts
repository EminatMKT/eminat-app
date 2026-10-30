import type { ReactNode } from 'react'

/** Props for a plain, taggable layout box: no markup of its own beyond the one tag it renders. */
export type BoxProps = {
  as?: 'li' | 'div'
  className?: string
  children: ReactNode
}
