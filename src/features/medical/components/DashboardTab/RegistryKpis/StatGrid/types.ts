import type { ReactNode } from 'react'

export type Stat = {
  label: string
  value: ReactNode
  color: string
  footnote?: string
}

export type Props = {
  className: string
  size?: 'sm' | 'md'
  stats: Stat[]
}
