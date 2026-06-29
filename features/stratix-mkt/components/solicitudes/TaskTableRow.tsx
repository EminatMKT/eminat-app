'use client'
import { useApp, ESTADO_COLORS, MIEMBROS_REFS, getColorMarca } from '@/shared/context/AppContext'
import { useStratix } from '../StratixContext'

export default function TaskTableRow({ a }: { a: any }) {
  const { t1, t3, border, esAdmin } = useApp()
  const { setModalVerAct } = useStratix()
  return (
    <tr key={a.id} onClick={() => setModalVerAct(a)} style={{ borderBottom: `1px solid ${border}`, cursor: 'pointer' }}>
      <td style={{ padding: '10px 14px' }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: t1 }}>{a.titulo}</div>
        {a.descripcion && <div style={{ fontSize: 10, color: t3, marginTop: 2, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.descripcion}</div>}
      </td>
      <td style={{ padding: '10px 14px' }}>
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${getColorMarca(a.area_ref)}25`, color: getColorMarca(a.area_ref), fontWeight: 600 }}>{a.area_ref}</span>
      </td>
      {esAdmin && <td style={{ padding: '10px 14px', fontSize: 11, color: t3 }}>{MIEMBROS_REFS[a.responsable_ref] || a.responsable_ref}</td>}
      <td style={{ padding: '10px 14px', fontSize: 11, color: t3 }}>{a.mes}</td>
      <td style={{ padding: '10px 14px', fontSize: 11, color: t3, fontFamily: 'DM Mono' }}>{a.horas}h</td>
      <td style={{ padding: '10px 14px' }}>
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${ESTADO_COLORS[a.estado] || t3}20`, color: ESTADO_COLORS[a.estado] || t3 }}>{a.estado}</span>
      </td>
      <td style={{ padding: '10px 14px', fontSize: 11, color: a.fecha_entrega && new Date(a.fecha_entrega) < new Date() && a.estado !== 'Completado' ? '#F87171' : t3 }}>
        {a.fecha_entrega ? new Date(a.fecha_entrega + 'T00:00:00').toLocaleDateString('en-US') : '—'}
      </td>
      <td style={{ padding: '10px 14px' }}>
        {a.drive_url ? <a href={a.drive_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 10, color: '#60A5FA', textDecoration: 'none' }}>🔗 View</a> : <span style={{ fontSize: 10, color: t3 }}>—</span>}
      </td>
    </tr>
  )
}
