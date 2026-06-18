'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useMedical } from './MedicalContext'
import { useMedicalStyles } from '../hooks/useMedicalStyles'
import type { HipaaIncidente } from '../types'

export default function IncidenteModal({ onClose }: { onClose: () => void }) {
  const { t1, inputStyle } = useApp()
  const { addIncidente, hoy } = useMedical()
  const { modalOverlay, modalBox, labelStyle, btnPrimary, btnSecondary } = useMedicalStyles()
  const [form, setForm] = useState<Partial<HipaaIncidente>>({})

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 16, color: t1, marginBottom: 4 }}>Report HIPAA Incident</div>
        <div style={{ fontSize: 11, color: '#F87171', marginBottom: 20 }}>🛡️ Incidents are logged and audited</div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div><label style={labelStyle}>Incident Title *</label><input value={form.titulo || ''} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} style={inputStyle} /></div>
          <div><label style={labelStyle}>Description</label><textarea value={form.descripcion || ''} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Type</label>
              <select value={form.tipo || 'near_miss'} onChange={e => setForm(p => ({ ...p, tipo: e.target.value as HipaaIncidente['tipo'] }))} style={inputStyle}>
                <option value="near_miss">Near Miss</option>
                <option value="violation">Violation</option>
                <option value="breach">Breach</option>
                <option value="complaint">Complaint</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Severity</label>
              <select value={form.severidad || 'media'} onChange={e => setForm(p => ({ ...p, severidad: e.target.value as HipaaIncidente['severidad'] }))} style={inputStyle}>
                <option value="baja">Low</option>
                <option value="media">Medium</option>
                <option value="alta">High</option>
                <option value="critica">Critical</option>
              </select>
            </div>
            <div><label style={labelStyle}>Incident Date</label><input type="date" value={form.fecha_incidente || hoy} onChange={e => setForm(p => ({ ...p, fecha_incidente: e.target.value }))} style={inputStyle} /></div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={btnSecondary}>Cancel</button>
          <button onClick={() => { if (addIncidente(form)) onClose() }} style={{ ...btnPrimary, background: '#F87171' }}>Report Incident</button>
        </div>
      </div>
    </div>
  )
}
