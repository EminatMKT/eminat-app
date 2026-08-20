import type { ReactNode } from 'react'
import s from './index.module.css'

// Un dato de la ficha de actividad: rótulo arriba, valor abajo.
export default function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={s.campo}>
      <div className={s.label}>{label}</div>
      <div className={s.valor}>{value}</div>
    </div>
  )
}
