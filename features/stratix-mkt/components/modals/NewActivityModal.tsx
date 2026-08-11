'use client'
import { useEffect } from 'react'
import { useApp, MESES, COLUMNAS_KANBAN, SOLICITANTES } from '@/shared/context/AppContext'
import { useStratix } from '../StratixContext'

export default function NewActivityModal() {
  const { s1, border, accent, t1, t2, t3, inputStyle, miembrosAsignables, marcas } = useApp()
  const { modalNuevaAct, setModalNuevaAct, nuevaAct, setNuevaAct, creandoAct, crearActividad } = useStratix()

  // El form arranca con valores por defecto fijos, pero las dos listas son
  // dinámicas: si el default ya no está entre las opciones —el admin desmarcó esa
  // empresa, esa persona dejó el equipo— el navegador muestra la primera opción
  // mientras el estado conserva el valor viejo, y se guardaría el que no se ve.
  // Sincronizar el estado con lo que el select realmente muestra cierra ese hueco.
  useEffect(() => {
    if (marcas.length && !marcas.some(m => m.codigo === nuevaAct.empresa)) {
      setNuevaAct(p => ({ ...p, empresa: marcas[0].codigo }))
    }
  }, [marcas, nuevaAct.empresa, setNuevaAct])

  useEffect(() => {
    if (miembrosAsignables.length && !miembrosAsignables.some(m => m.ref === nuevaAct.responsable_ref)) {
      setNuevaAct(p => ({ ...p, responsable_ref: miembrosAsignables[0].ref }))
    }
  }, [miembrosAsignables, nuevaAct.responsable_ref, setNuevaAct])

  if (!modalNuevaAct) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: s1, border: `1px solid ${border}`, borderRadius: 18, padding: 28, width: 520, maxWidth: '95vw', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, color: t1 }}>New task</div>
            <div style={{ fontSize: 11, color: t3, marginTop: 2 }}>Fill in the fields to add to Kanban</div>
          </div>
          <button onClick={() => setModalNuevaAct(false)} style={{ background: 'none', border: 'none', color: t3, fontSize: 22, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>Task title <span style={{ color: '#F87171' }}>*</span></label>
          <input type="text" value={nuevaAct.titulo} onChange={e => setNuevaAct(p => ({ ...p, titulo: e.target.value }))} placeholder="E.g. Design banner for EMC social media" autoFocus style={{ ...inputStyle, fontSize: 14, padding: '11px 14px' }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>Description (optional)</label>
          <textarea value={nuevaAct.descripcion} onChange={e => setNuevaAct(p => ({ ...p, descripcion: e.target.value }))} placeholder="Describe what this task includes..." rows={3} style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>🎨 Brand / Area <span style={{ color: '#F87171' }}>*</span></label>
            <select value={nuevaAct.empresa} onChange={e => setNuevaAct(p => ({ ...p, empresa: e.target.value }))} style={inputStyle}>
              {marcas.map(a => <option key={a.codigo} value={a.codigo}>{a.codigo} — {a.nombre}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>👤 Assignee <span style={{ color: '#F87171' }}>*</span></label>
            <select value={nuevaAct.responsable_ref} onChange={e => setNuevaAct(p => ({ ...p, responsable_ref: e.target.value }))} style={inputStyle}>
              {miembrosAsignables.map((m) => <option key={m.ref} value={m.ref}>{m.nombre}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>📨 Requested by</label>
          <select value={nuevaAct.solicitado_por} onChange={e => setNuevaAct(p => ({ ...p, solicitado_por: e.target.value }))} style={inputStyle}>
            {SOLICITANTES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>📅 Month</label>
            <select value={nuevaAct.mes} onChange={e => setNuevaAct(p => ({ ...p, mes: e.target.value }))} style={inputStyle}>
              {MESES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>⏱ Estimated hours</label>
            <input type="number" value={nuevaAct.horas} onChange={e => setNuevaAct(p => ({ ...p, horas: e.target.value }))} placeholder="0" min="0" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>📆 Prod. days</label>
            <input type="number" value={nuevaAct.dias_produccion} onChange={e => setNuevaAct(p => ({ ...p, dias_produccion: e.target.value }))} placeholder="0" min="0" style={inputStyle} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>⚡ Initial status</label>
            <select value={nuevaAct.estado} onChange={e => setNuevaAct(p => ({ ...p, estado: e.target.value }))} style={inputStyle}>
              {COLUMNAS_KANBAN.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>🗓 Due date</label>
            <input type="date" value={nuevaAct.fecha_entrega} onChange={e => setNuevaAct(p => ({ ...p, fecha_entrega: e.target.value }))} style={inputStyle} />
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: t2, display: 'block', marginBottom: 6, fontWeight: 500 }}>🔗 Google Drive link (optional)</label>
          <input type="url" value={nuevaAct.drive_url} onChange={e => setNuevaAct(p => ({ ...p, drive_url: e.target.value }))} placeholder="https://drive.google.com/drive/folders/..." style={inputStyle} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setModalNuevaAct(false)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: t2, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={crearActividad} disabled={creandoAct || !nuevaAct.titulo.trim()} style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: creandoAct || !nuevaAct.titulo.trim() ? t3 : accent, color: 'white', fontSize: 13, fontWeight: 600, cursor: creandoAct || !nuevaAct.titulo.trim() ? 'not-allowed' : 'pointer' }}>
            {creandoAct ? '⏳ Creating...' : '✓ Create task'}
          </button>
        </div>
      </div>
    </div>
  )
}
