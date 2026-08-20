'use client'
import type { CSSProperties } from 'react'
import { useApp, ESTADO_COLORS } from '@/shared/context/AppContext'
import { COLOR_MARCA_FALLBACK } from '@/shared/context/empresa-derivations'
import { estadoLabel } from '@/shared/constants/domain'
import { useT } from '@/shared/i18n'
import { useStratix } from '@/features/stratix-mkt/components/StratixContext'
import { DIA_W } from '@/features/stratix-mkt/utils/gantt-layout'
import type { Actividad } from '@/features/stratix-mkt/types'
import s from './index.module.css'

const DIA_MS = 86400000

export default function GanttBar({ a, fechaMin }: { a: Actividad; fechaMin: Date }) {
  const { t } = useT()
  const { accent, miembrosPorId, colorMarca } = useApp()
  const { setModalVerAct } = useStratix()
  const diaOffset = Math.max(Math.ceil((new Date(a.fecha_entrega).getTime() - fechaMin.getTime()) / DIA_MS), 0)
  const diasProd = Math.max(Number(a.dias_produccion) || 1, 1)
  const vars = {
    '--left': `${diaOffset * DIA_W + 4}px`,
    '--width': `${Math.max(diasProd * DIA_W - 8, 36)}px`,
    '--estado': ESTADO_COLORS[a.estado] || accent,
    '--marca': colorMarca[a.empresa] ?? COLOR_MARCA_FALLBACK,
  } as CSSProperties

  return (
    <div className={s.row} style={vars} onClick={() => setModalVerAct(a)}>
      <div className={s.info}>
        <div className={s.titulo}>{a.titulo}</div>
        <div className={s.meta}>
          <span className={s.quien}>{miembrosPorId[a.responsable_id] ?? '—'}</span>
          <span className={s.marca}>{a.empresa}</span>
        </div>
      </div>
      <div className={s.pista}>
        <div className={s.barra}>
          <div className={s.punto} />
          <span className={s.estado}>{estadoLabel(a.estado, t)}</span>
        </div>
      </div>
    </div>
  )
}
