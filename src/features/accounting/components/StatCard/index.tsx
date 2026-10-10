import type { CSSProperties } from 'react'
import s from './index.module.css'

type Props = {
  label: string
  value: string
  color: string
  compact?: boolean
}

/** Accounting KPI card with the accent color supplied by its caller. */
export default function StatCard({ label, value, color, compact = false }: Props) {
  return (
    <div className={`${s.card} ${compact ? s.compact : s.full}`} style={{ '--stat-color': color } as CSSProperties}>
      <div className={s.label}>{label}</div>
      <div className={`${s.value} ${compact ? s.compact : s.full}`}>{value}</div>
    </div>
  )
}
