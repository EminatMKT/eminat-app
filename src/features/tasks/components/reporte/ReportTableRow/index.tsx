'use client'
import { estadoLabel } from '@/shared/constants/domain'
import { useT } from '@/shared/i18n'
import type { Actividad } from '@/features/tasks/types'
import s from './index.module.css'

type Props = {
  a: Actividad
  responsable: string
  showMetrics?: boolean
}

export default function ReportTableRow({ a, responsable, showMetrics = false }: Props) {
  const { t } = useT()
  return (
    <tr className={s.row}>
      <td className={s.titulo}>{a.titulo}{a.descripcion && <div style={{ whiteSpace: 'pre-wrap', fontWeight: 400 }}>{a.descripcion}</div>}</td>
      <td className={s.td}>{a.empresa}</td>
      <td className={s.td}>{responsable}</td>
      <td className={s.td}>{a.fecha_inicio || '—'}</td>
      <td className={s.td}>{a.fecha_entrega || '—'}</td>
      <td className={s.td}>{estadoLabel(a.estado, t)}</td>
      {showMetrics && <td className={s.td}>{a.horas ?? 0}</td>}
    </tr>
  )
}
