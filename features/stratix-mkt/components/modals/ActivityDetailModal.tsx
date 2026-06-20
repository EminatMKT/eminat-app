'use client'
import { useApp, ESTADO_COLORS, MIEMBROS_REFS, SOLICITANTES, COLUMNAS_KANBAN, mesATrimestre, getColorMarca } from '@/shared/context/AppContext'
import { actividadesRepo } from '@/shared/data'
import { useStratix } from '../StratixContext'
import DetailField from './DetailField'

export default function ActivityDetailModal() {
  const { s1, s2, border, accent, t1, t2, t3, setActividades, mostrarMensaje } = useApp()
  const { modalVerAct, setModalVerAct } = useStratix()
  if (!modalVerAct) return null

  const fields = [
    { label: 'Assignee', value: MIEMBROS_REFS[modalVerAct.responsable_ref] || modalVerAct.responsable_ref },
    { label: 'Requested by', value: SOLICITANTES.find(s => s.value === modalVerAct.solicitado_por)?.label || modalVerAct.solicitado_por || '—' },
    { label: 'Month', value: modalVerAct.mes },
    { label: 'Quarter', value: modalVerAct.trimestre || mesATrimestre[modalVerAct.mes || 'Enero'] || 'Q1' },
    { label: 'Estimated hours', value: `${modalVerAct.horas || 0}h` },
    { label: 'Production days', value: modalVerAct.dias_produccion || '0' },
    { label: 'Due date', value: modalVerAct.fecha_entrega ? new Date(modalVerAct.fecha_entrega + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'long' }) : 'No date' },
    { label: 'Verified', value: modalVerAct.verificado ? '✓ Yes' : '✕ No' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setModalVerAct(null)}>
      <div onClick={e => e.stopPropagation()} style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 500, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 8, background: `${getColorMarca(modalVerAct.area_ref)}25`, color: getColorMarca(modalVerAct.area_ref), fontWeight: 600 }}>{modalVerAct.area_ref}</span>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 8, background: `${ESTADO_COLORS[modalVerAct.estado] || t3}20`, color: ESTADO_COLORS[modalVerAct.estado] || t3 }}>{modalVerAct.estado}</span>
            </div>
            <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800, color: t1, lineHeight: 1.3 }}>{modalVerAct.titulo}</div>
          </div>
          <button onClick={() => setModalVerAct(null)} style={{ background: 'none', border: 'none', color: t3, fontSize: 22, cursor: 'pointer', flexShrink: 0, marginLeft: 12 }}>✕</button>
        </div>
        {modalVerAct.descripcion && (
          <div style={{ marginBottom: 16, padding: '12px', background: s2, borderRadius: 10, fontSize: 13, color: t2, lineHeight: 1.5 }}>{modalVerAct.descripcion}</div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {fields.map(item => (
            <DetailField key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: t3, marginBottom: 8, fontFamily: 'DM Mono', textTransform: 'uppercase' }}>Change status</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {COLUMNAS_KANBAN.map(col => (
              <button key={col} onClick={async () => {
                await actividadesRepo.updateEstado(modalVerAct.id, col)
                setActividades(prev => prev.map(a => a.id === modalVerAct.id ? { ...a, estado: col } : a))
                setModalVerAct((p: any) => ({ ...p, estado: col }))
                mostrarMensaje('ok', `Status → "${col}"`)
              }} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, border: `2px solid ${modalVerAct.estado === col ? ESTADO_COLORS[col] : border}`, background: modalVerAct.estado === col ? `${ESTADO_COLORS[col]}20` : 'transparent', color: modalVerAct.estado === col ? ESTADO_COLORS[col] : t2, cursor: 'pointer', fontWeight: modalVerAct.estado === col ? 700 : 400 }}>{col}</button>
            ))}
          </div>
        </div>
        {modalVerAct.drive_url && (
          <a href={modalVerAct.drive_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: `${accent}15`, color: accent, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
            🔗 View folder in Google Drive
          </a>
        )}
      </div>
    </div>
  )
}
