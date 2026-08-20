import type { CSSProperties, ReactNode } from 'react'
import s from './index.module.css'

// Existía tres veces con tres nombres: CampaignStatBox (Research), HoursStat (Stratix) y el
// StatCard de Accounting. Lo detectó praxis-similar-components con 0.95 de similitud.
export default function StatBox({ label, value, color, size = 'md' }: {
  label: string
  value: ReactNode
  color?: string
  size?: 'md' | 'lg'
}) {
  return (
    <div className={`${s.box} ${size === 'lg' ? s.lg : ''}`} style={{ '--color': color } as CSSProperties}>
      <div className={s.valor}>{value}</div>
      <div className={s.label}>{label}</div>
    </div>
  )
}
