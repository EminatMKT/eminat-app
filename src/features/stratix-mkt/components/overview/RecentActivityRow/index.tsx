'use client'
import type { CSSProperties } from 'react'
import { useApp, ESTADO_COLORS } from '@/shared/context/AppContext'
import type { Actividad } from '@/features/stratix-mkt/types'
import s from './index.module.css'
import { estadoLabel } from '@/shared/constants/domain'
import { useT } from '@/shared/i18n'

// Una fila de "Actividad reciente". El color del estado entra como variable y se usa dos veces
// —el punto y el chip—, así el JSX lo pasa una sola vez y el CSS decide qué hace con él.
export default function RecentActivityRow({ a }: { a: Actividad }) {
  const { t } = useT()
  const { miembrosPorId } = useApp()
  const estadoColor = ESTADO_COLORS[a.estado] || 'var(--c-t3)'
  return (
    <div className={s.row} style={{ '--estado': estadoColor } as CSSProperties}>
      <div className={s.dot} />
      <div className={s.body}>
        <div className={s.title}>{a.titulo}</div>
        <div className={s.meta}>{a.empresa} · {miembrosPorId[a.responsable_id] ?? '—'} · {a.mes}</div>
      </div>
      <span className={s.badge}>{estadoLabel(a.estado, t)}</span>
    </div>
  )
}
