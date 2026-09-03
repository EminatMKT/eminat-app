import type { CSSProperties } from 'react'
import s from './index.module.css'

type Miembro = { id: string; nombre: string; total: number; completadas: number; horas: number }

// Un renglón del ranking: posición, nombre, cifras y la barra de avance.
// Ya no lee colores del contexto — los toma de las variables CSS del contenido (--c-*).
type Props = {
  m: Miembro
  i: number
  maxMiembro: number
}

export default function TeamRankRow({ m, i, maxMiembro }: Props) {
  const pct = maxMiembro > 0 ? (m.total / maxMiembro) * 100 : 0
  return (
    <div>
      <div className={s.head}>
        <div className={s.who}>
          <span className={s.pos}>{i + 1}</span>
          <span className={s.name}>{m.nombre}</span>
        </div>
        <div className={s.figures}>
          <span className={s.done}>{m.completadas}✓</span>
          <span className={s.hours}>{m.horas}h</span>
        </div>
      </div>
      <div className={s.track}>
        <div className={s.fill} style={{ '--pct': `${pct}%` } as CSSProperties} />
      </div>
    </div>
  )
}
