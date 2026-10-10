import type { ReactNode } from 'react'
import s from './index.module.css'

type Props = {
  title: string
  subtitle?: string
  children: ReactNode
}

export default function SectionCard({ title, subtitle, children }: Props) {
  return (
    <div className={s.card}>
      <div className={s.head}>
        <div className={s.title}>{title}</div>
        {subtitle && <div className={s.subtitle}>{subtitle}</div>}
      </div>
      {children}
    </div>
  )
}
