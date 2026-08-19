'use client'
import { useApp } from '@/shared/context/AppContext'
import { COLOR_MARCA_FALLBACK } from '@/shared/context/empresa-derivations'
import { useStratix } from '../StratixContext'
import type { Actividad } from '../../types'

export default function KanbanTaskCard({ a }: { a: Actividad }) {
  const { s1, border, accent, t1, t3, miembrosPorId, colorMarca } = useApp()
  const { dragId, onDragStart, onDragEnd, setModalVerAct } = useStratix()
  const marcaColor = colorMarca[a.empresa] ?? COLOR_MARCA_FALLBACK
  const nombreMiembro = miembrosPorId[a.responsable_id]
  return (
    <div key={a.id} draggable onDragStart={() => onDragStart(a.id)} onDragEnd={onDragEnd} onClick={() => setModalVerAct(a)}
      style={{ background: s1, borderRadius: 12, padding: '12px 13px', border: `1px solid ${dragId === a.id ? accent : border}`, cursor: 'grab', opacity: dragId === a.id ? .4 : 1, boxShadow: '0 1px 4px rgba(0,0,0,0.15)', transition: 'all .15s' }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: `${marcaColor}25`, color: marcaColor, fontWeight: 600 }}>{a.empresa}</span>
        {a.mes && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: `${t3}20`, color: t3 }}>{a.mes}</span>}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: t1, lineHeight: 1.4, marginBottom: 10 }}>{a.titulo}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'white', flexShrink: 0 }}>
            {nombreMiembro?.[0] || '?'}
          </div>
          <span style={{ fontSize: 10, color: t3 }}>{nombreMiembro ?? '—'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {a.horas && <span style={{ fontSize: 9, color: t3 }}>⏱ {a.horas}h</span>}
          {a.fecha_entrega && <span style={{ fontSize: 9, color: new Date(a.fecha_entrega) < new Date() && a.estado !== 'Completado' ? '#F87171' : t3 }}>📅 {new Date(a.fecha_entrega + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>}
          {a.drive_url && <span style={{ fontSize: 9, color: '#60A5FA' }}>🔗</span>}
        </div>
      </div>
    </div>
  )
}
