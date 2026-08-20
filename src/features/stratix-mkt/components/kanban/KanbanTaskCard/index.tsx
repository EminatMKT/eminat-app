'use client'
import type { CSSProperties } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { COLOR_MARCA_FALLBACK } from '@/shared/context/empresa-derivations'
import { ESTADO } from '@/shared/constants/domain'
import { useStratix } from '@/features/stratix-mkt/components/StratixContext'
import type { Actividad } from '@/features/stratix-mkt/types'
import s from './index.module.css'

type Props = {
  a: Actividad
}

export default function KanbanTaskCard({ a }: Props) {
  const { miembrosPorId, colorMarca } = useApp()
  const { dragId, onDragStart, onDragEnd, setModalVerAct } = useStratix()
  const nombre = miembrosPorId[a.responsable_id]
  const vencida = !!a.fecha_entrega && new Date(a.fecha_entrega) < new Date() && a.estado !== ESTADO.COMPLETADO
  return (
    <div className={`${s.card} ${dragId === a.id ? s.arrastrando : ''}`}
      style={{ '--marca': colorMarca[a.empresa] ?? COLOR_MARCA_FALLBACK } as CSSProperties}
      draggable onDragStart={() => onDragStart(a.id)} onDragEnd={onDragEnd} onClick={() => setModalVerAct(a)}>
      <div className={s.tags}>
        <span className={s.marca}>{a.empresa}</span>
        {a.mes && <span className={s.mes}>{a.mes}</span>}
      </div>
      <div className={s.titulo}>{a.titulo}</div>
      <div className={s.pie}>
        <div className={s.persona}>
          <div className={s.avatar}>{nombre?.[0] || '?'}</div>
          <span className={s.quien}>{nombre ?? '—'}</span>
        </div>
        <div className={s.meta}>
          {a.horas && <span className={s.dato}>⏱ {a.horas}h</span>}
          {a.fecha_entrega && (
            <span className={`${s.dato} ${vencida ? s.vencida : ''}`}>
              📅 {new Date(a.fecha_entrega + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
            </span>
          )}
          {a.drive_url && <span className={s.link}>🔗</span>}
        </div>
      </div>
    </div>
  )
}
