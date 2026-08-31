'use client'
import type { CSSProperties } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { COLOR_MARCA_FALLBACK } from '@/shared/context/empresa-derivations'
import { ESTADO, ESTADO_COLORS, estadoLabel } from '@/shared/constants/domain'
import { useT } from '@/shared/i18n'
import { useStratix } from '@/features/stratix-mkt/components/StratixContext'
import { periodoLargo } from '@/features/stratix-mkt/utils/periodo'
import type { Actividad } from '@/features/stratix-mkt/types'
import s from './index.module.css'

type Props = {
  a: Actividad
}

export default function TaskTableRow({ a }: Props) {
  const { t, intlLocale } = useT()
  const { miembrosPorId, colorMarca } = useApp()
  const { setModalVerAct } = useStratix()
  const vencida = !!a.fecha_entrega && new Date(a.fecha_entrega) < new Date() && a.estado !== ESTADO.COMPLETADO
  const vars = {
    '--marca': colorMarca[a.empresa] ?? COLOR_MARCA_FALLBACK,
    '--estado': ESTADO_COLORS[a.estado] || 'var(--c-t3)',
  } as CSSProperties

  return (
    <tr className={s.row} style={vars} onClick={() => setModalVerAct(a)}>
      <td className={s.tdTitulo}>
        <div className={s.titulo}>{a.titulo}</div>
        {a.descripcion && <div className={s.desc}>{a.descripcion}</div>}
      </td>
      <td className={s.tdTitulo}><span className={s.chipMarca}>{a.empresa}</span></td>
      <td className={s.td}>{miembrosPorId[a.responsable_id] ?? '—'}</td>
      <td className={s.td}>{periodoLargo(a.fecha_inicio, intlLocale, 'short')}</td>
      <td className={`${s.td} ${s.mono}`}>{a.horas || 0}h</td>
      <td className={s.tdTitulo}><span className={s.chipEstado}>{estadoLabel(a.estado, t)}</span></td>
      <td className={`${s.td} ${vencida ? s.vencida : ''}`}>
        {a.fecha_entrega ? new Date(a.fecha_entrega + 'T00:00:00').toLocaleDateString() : '—'}
      </td>
      <td className={s.tdTitulo}>
        {a.drive_url
          ? <a className={s.link} href={a.drive_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>🔗 {t('stratix.sol.view')}</a>
          : <span className={s.td}>—</span>}
      </td>
    </tr>
  )
}
