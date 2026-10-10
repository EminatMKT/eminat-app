import type { ReactNode } from 'react'
import s from './index.module.css'

type Props = {
  children: ReactNode
}

export default function Tr({ children }: Props) {
  return <tr className={s.row}>{children}</tr>
}
