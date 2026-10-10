import type { ReactNode } from 'react'
import s from './index.module.css'

type Props = {
  children: ReactNode
}

export default function TableWrap({ children }: Props) {
  return <div className={s.wrap}><table className={s.table}>{children}</table></div>
}
