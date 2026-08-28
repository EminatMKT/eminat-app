'use client'
import type { CSSProperties } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { COLOR_MARCA_FALLBACK } from '@/shared/context/empresa-derivations'
import { useT } from '@/shared/i18n'
import { useStratix } from '@/features/stratix-mkt/components/StratixContext'
import { datosTarjeta } from '@/features/stratix-mkt/utils/act-tarjeta'
import type { Actividad } from '@/features/stratix-mkt/types'
import s from './index.module.css'

type Props = {
  a: Actividad
}

export default function KanbanTaskCard({ a }: Props) {
  const { miembrosPorId, colorMarca } = useApp()
  const { t, locale } = useT()
  const { dragId, onDragStart, onDragEnd, setModalVerAct } = useStratix()

  const nombre = miembrosPorId[a.responsable_id ?? '']
  const { inicial, entrega, vencida } = datosTarjeta(a, nombre, locale)
  const vars = { '--marca': colorMarca[a.empresa ?? ''] ?? COLOR_MARCA_FALLBACK } as CSSProperties

  return (
    <div className={dragId === a.id ? `${s.card} ${s.arrastrando}` : s.card} style={vars}
      draggable onDragStart={() => onDragStart(a.id ?? '')} onDragEnd={onDragEnd} onClick={() => setModalVerAct(a)}>
      <div className={s.contexto}>
        <span className={s.marca}>{a.empresa}</span>
        {a.mes && <span className={s.separador}>/</span>}
        {a.mes && <span className={s.periodo}>{a.mes}</span>}
        <span className={s.espacio} />
        {a.drive_url && <span className={s.drive} title={t('stratix.detail.driveFolder')} />}
      </div>

      <div className={s.titulo}>{a.titulo}</div>

      <div className={s.pie}>
        <div className={s.persona}>
          <div className={s.avatar}>{inicial}</div>
          <span className={s.quien}>{nombre ?? '—'}</span>
        </div>
        <div className={s.meta}>
          {!!a.horas && <span>{a.horas}h</span>}
          {entrega && <span className={vencida ? s.vencida : undefined}>{entrega}</span>}
        </div>
      </div>
    </div>
  )
}
