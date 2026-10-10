import type { ReactNode } from 'react'
import s from './index.module.css'

type Props = {
  children: ReactNode
  align?: 'left' | 'right'
}

export default function Th({ children, align = 'left' }: Props) {
  return <th className={`${s.th} ${s[align]}`}>{children}</th>
}
