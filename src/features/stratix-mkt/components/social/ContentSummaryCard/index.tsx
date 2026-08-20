import type { CSSProperties } from 'react'
import s from './index.module.css'

type Item = { label: string; value: number; icon: string; color: string }

export default function ContentSummaryCard({ item }: { item: Item }) {
  return (
    <div className={s.card} style={{ '--color': item.color } as CSSProperties}>
      <div className={s.icono}>{item.icon}</div>
      <div className={s.valor}>{item.value}</div>
      <div className={s.label}>{item.label}</div>
    </div>
  )
}
