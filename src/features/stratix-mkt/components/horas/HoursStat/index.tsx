import type { CSSProperties, ReactNode } from 'react'
import s from './index.module.css'

// Una de las tres cifras de la tarjeta de horas.
export default function HoursStat({ label, value, color }: { label: string; value: ReactNode; color?: string }) {
  return (
    <div className={s.box} style={{ '--color': color } as CSSProperties}>
      <div className={s.value}>{value}</div>
      <div className={s.label}>{label}</div>
    </div>
  )
}
