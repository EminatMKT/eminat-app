'use client'
import { useApp, ESTADO_COLORS } from '@/shared/context/AppContext'
import type { Actividad } from '../../types'

export default function ReportTableRow({ a, responsable }: { a: Actividad; responsable: string }) {
  const { border, t1, t3 } = useApp()
  return (
    <tr key={a.id} style={{ borderBottom: `1px solid ${border}` }}>
      <td style={{ padding: '8px 12px', color: t1 }}>{a.titulo}</td>
      <td style={{ padding: '8px 12px', color: t3 }}>{a.empresa}</td>
      <td style={{ padding: '8px 12px', color: t3 }}>{responsable}</td>
      <td style={{ padding: '8px 12px', color: t3, fontFamily: 'DM Mono' }}>{a.horas || 0}h</td>
      <td style={{ padding: '8px 12px', color: t3, fontFamily: 'DM Mono' }}>{a.dias_produccion}</td>
      <td style={{ padding: '8px 12px' }}>
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${ESTADO_COLORS[a.estado] || t3}20`, color: ESTADO_COLORS[a.estado] || t3 }}>{a.estado}</span>
      </td>
    </tr>
  )
}
