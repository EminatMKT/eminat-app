'use client'
import type { CSSProperties } from 'react'
import { ESTADO_COLORS, estadoLabel } from '@/shared/constants/domain'
import { useT } from '@/shared/i18n'
import type { Actividad } from '@/features/stratix-mkt/types'
import s from './index.module.css'

type Props = {
  a: Actividad
  responsable: string
}

export default function ReportTableRow({ a, responsable }: Props) {
  const { t } = useT()
  return (
    <tr className={s.row} style={{ '--estado': ESTADO_COLORS[a.estado] || 'var(--c-t3)' } as CSSProperties}>
      <td className={s.titulo}>{a.titulo}</td>
      <td className={s.td}>{a.empresa}</td>
      <td className={s.td}>{responsable}</td>
      <td className={`${s.td} ${s.mono}`}>{a.horas || 0}h</td>
      <td className={`${s.td} ${s.mono}`}>{a.dias_produccion}</td>
      <td className={s.plano}><span className={s.chip}>{estadoLabel(a.estado, t)}</span></td>
    </tr>
  )
}
