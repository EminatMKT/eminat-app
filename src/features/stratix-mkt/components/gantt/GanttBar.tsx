'use client'
import { useApp, ESTADO_COLORS } from '@/shared/context/AppContext'
import { COLOR_MARCA_FALLBACK } from '@/shared/context/empresa-derivations'
import { useStratix } from '../StratixContext'
import type { Actividad } from '../../types'

export default function GanttBar({ a, fechaMin }: { a: Actividad; fechaMin: Date }) {
  const { accent, border, t1, t3, miembrosPorId, colorMarca } = useApp()
  const { setModalVerAct } = useStratix()
  const fechaAct = new Date(a.fecha_entrega)
  const diaOffset = Math.max(Math.ceil((fechaAct.getTime() - fechaMin.getTime()) / 86400000), 0)
  const colorBarra = ESTADO_COLORS[a.estado] || accent
  const marcaColor = colorMarca[a.empresa] ?? COLOR_MARCA_FALLBACK
  const diasProd = Math.max(Number(a.dias_produccion) || 1, 1)
  return (
    <div key={a.id} onClick={() => setModalVerAct(a)} style={{ display: 'flex', borderBottom: `1px solid ${border}`, cursor: 'pointer' }}>
      <div style={{ width: 220, flexShrink: 0, padding: '10px 14px', borderRight: `1px solid ${border}` }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.titulo}</div>
        <div style={{ fontSize: 9, color: t3, marginTop: 2 }}>
          <span style={{ marginRight: 6 }}>{miembrosPorId[a.responsable_id] ?? '—'}</span>
          <span style={{ padding: '1px 5px', borderRadius: 4, background: `${marcaColor}25`, color: marcaColor, fontSize: 8 }}>{a.empresa}</span>
        </div>
      </div>
      <div style={{ flex: 1, position: 'relative', height: 48, overflowX: 'hidden' }}>
        <div style={{ position: 'absolute', left: diaOffset * 44 + 4, top: '50%', transform: 'translateY(-50%)', height: 22, width: Math.max(diasProd * 44 - 8, 36), borderRadius: 8, background: `${colorBarra}25`, border: `1.5px solid ${colorBarra}`, display: 'flex', alignItems: 'center', padding: '0 8px', gap: 4 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: colorBarra, flexShrink: 0 }} />
          <span style={{ fontSize: 9, color: colorBarra, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>{a.estado}</span>
        </div>
      </div>
    </div>
  )
}
