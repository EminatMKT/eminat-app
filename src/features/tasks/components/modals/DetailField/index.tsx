import type { ReactNode } from 'react'
import s from './index.module.css'

// Un dato de la ficha de actividad: rótulo arriba, valor abajo.
type Props = {
  label: string
  value: ReactNode
}

export default function DetailField({ label, value }: Props) {
  return (
    <div className={s.campo}>
      <div className={s.label}>{label}</div>
      <div className={s.valor}>{value}</div>
    </div>
  )
}
