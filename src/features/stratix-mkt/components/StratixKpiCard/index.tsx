'use client'
import type { CSSProperties, ReactNode } from 'react'
import s from './index.module.css'

// KPI card de Social y Competencia (rótulo en versalitas + cifra grande + pie).
type Kpi = { label: string; value: string; valueColor: string; sub: ReactNode; subAccent?: boolean }

export default function StratixKpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <div className={s.card} style={{ '--valor': kpi.valueColor } as CSSProperties}>
      <div className={s.label}>{kpi.label}</div>
      <div className={s.valor}>{kpi.value}</div>
      <div className={`${s.sub} ${kpi.subAccent ? s.positivo : ''}`}>{kpi.sub}</div>
    </div>
  )
}
