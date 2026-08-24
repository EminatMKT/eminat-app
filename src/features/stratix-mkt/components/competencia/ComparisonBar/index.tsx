import type { CSSProperties, ReactNode } from 'react'
import s from './index.module.css'

// Una barra de la comparación de Instagram. `propia` es la de Eminat: misma forma, destacada.
type Props = {
  nombre: string
  pct: number
  valor: string
  relleno: string
  propia?: boolean
  right?: ReactNode
}

export default function ComparisonBar({ nombre, pct, valor, relleno, propia = false, right }: Props) {
  return (
    <div className={`${s.fila} ${propia ? s.propia : ''}`}
      style={{ '--pct': `${pct}%`, '--relleno': relleno } as CSSProperties}>
      <div className={s.nombre}>{nombre}</div>
      <div className={s.track}>
        <div className={s.fill}><span className={s.cifra}>{valor}</span></div>
      </div>
      {right}
    </div>
  )
}
