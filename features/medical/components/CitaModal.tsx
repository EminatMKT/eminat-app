'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useMedical } from './MedicalContext'
import { useMedicalStyles } from '../hooks/useMedicalStyles'
import { TIPOS_CITA, DOCTORES, SALAS } from '../constants'
import type { Cita } from '../types'

export default function CitaModal({ onClose }: { onClose: () => void }) {
  const { t1, inputStyle } = useApp()
  const { addCita, pacientesActivos } = useMedical()
  const { modalOverlay, modalBox, labelStyle, btnPrimary, btnSecondary } = useMedicalStyles()
  const [form, setForm] = useState<Partial<Cita>>({})

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 16, color: t1, marginBottom: 20 }}>New Appointment</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Patient *</label>
            <select value={form.paciente_id || ''} onChange={e => setForm(p => ({ ...p, paciente_id: e.target.value }))} style={inputStyle}>
              <option value="">Select patient...</option>
              {pacientesActivos.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellido} — {p.mrn}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>Date *</label><input type="date" value={form.fecha || ''} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} style={inputStyle} /></div>
          <div><label style={labelStyle}>Time *</label><input type="time" value={form.hora || ''} onChange={e => setForm(p => ({ ...p, hora: e.target.value }))} style={inputStyle} /></div>
          <div>
            <label style={labelStyle}>Type</label>
            <select value={form.tipo || ''} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))} style={inputStyle}>
              <option value="">Select...</option>
              {TIPOS_CITA.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Doctor</label>
            <select value={form.doctor || ''} onChange={e => setForm(p => ({ ...p, doctor: e.target.value }))} style={inputStyle}>
              <option value="">Select...</option>
              {DOCTORES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Room</label>
            <select value={form.sala || ''} onChange={e => setForm(p => ({ ...p, sala: e.target.value }))} style={inputStyle}>
              {SALAS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>Duration (min)</label><input type="number" value={form.duracion || 30} onChange={e => setForm(p => ({ ...p, duracion: parseInt(e.target.value) }))} style={inputStyle} /></div>
          <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Notes</label><textarea value={form.notas || ''} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} /></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={btnSecondary}>Cancel</button>
          <button onClick={() => { if (addCita(form)) onClose() }} style={btnPrimary}>Schedule Appointment</button>
        </div>
      </div>
    </div>
  )
}
