'use client'
import { useApp, ESTADO_COLORS } from '@/shared/context/AppContext'
import { COLOR_MARCA_FALLBACK } from '@/shared/context/empresa-derivations'
import { useStratix } from '@/features/stratix-mkt/components/StratixContext'
import type { Actividad } from '@/features/stratix-mkt/types'
import { ESTADO, estadoLabel } from '@/shared/constants/domain'
import { useT } from '@/shared/i18n'

export default function TaskTableRow({ a }: { a: Actividad }) {
  const { t } = useT()
  const { t1, t3, border, esAdmin, miembrosPorId, colorMarca } = useApp()
  const { setModalVerAct } = useStratix()
  const marcaColor = colorMarca[a.empresa] ?? COLOR_MARCA_FALLBACK
  return (
    <tr key={a.id} onClick={() => setModalVerAct(a)} style={{ borderBottom: `1px solid ${border}`, cursor: 'pointer' }}>
      <td style={{ padding: '10px 14px' }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: t1 }}>{a.titulo}</div>
        {a.descripcion && <div style={{ fontSize: 10, color: t3, marginTop: 2, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.descripcion}</div>}
      </td>
      <td style={{ padding: '10px 14px' }}>
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${marcaColor}25`, color: marcaColor, fontWeight: 600 }}>{a.empresa}</span>
      </td>
      {esAdmin && <td style={{ padding: '10px 14px', fontSize: 11, color: t3 }}>{miembrosPorId[a.responsable_id] ?? '—'}</td>}
      <td style={{ padding: '10px 14px', fontSize: 11, color: t3 }}>{a.mes}</td>
      <td style={{ padding: '10px 14px', fontSize: 11, color: t3, fontFamily: 'DM Mono' }}>{a.horas || 0}h</td>
      <td style={{ padding: '10px 14px' }}>
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${ESTADO_COLORS[a.estado] || t3}20`, color: ESTADO_COLORS[a.estado] || t3 }}>{estadoLabel(a.estado, t)}</span>
      </td>
      <td style={{ padding: '10px 14px', fontSize: 11, color: a.fecha_entrega && new Date(a.fecha_entrega) < new Date() && a.estado !== ESTADO.COMPLETADO ? '#F87171' : t3 }}>
        {a.fecha_entrega ? new Date(a.fecha_entrega + 'T00:00:00').toLocaleDateString('en-US') : '—'}
      </td>
      <td style={{ padding: '10px 14px' }}>
        {a.drive_url ? <a href={a.drive_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 10, color: '#60A5FA', textDecoration: 'none' }}>🔗 View</a> : <span style={{ fontSize: 10, color: t3 }}>—</span>}
      </td>
    </tr>
  )
}
