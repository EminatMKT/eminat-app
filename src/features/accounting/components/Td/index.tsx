import type { CSSProperties, ReactNode } from 'react'
import s from './index.module.css'

type Props = {
  children: ReactNode
  align?: 'left' | 'right'
  mono?: boolean
  color?: string
  bold?: boolean
}

export default function Td({ children, align = 'left', mono = false, color, bold = false }: Props) {
  return (
    <td className={`${s.td} ${s[align]} ${mono ? s.mono : ''} ${bold ? s.bold : ''}`} style={{ '--td-color': color || 'var(--c-t1)' } as CSSProperties}>
      {children}
    </td>
  )
}
