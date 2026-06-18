'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useMedical } from './MedicalContext'
import { useMedicalStyles } from '../hooks/useMedicalStyles'
import { GENEROS, SEGUROS } from '../constants'
import type { Paciente } from '../types'

export default function PacienteModal({ onClose }: { onClose: () => void }) {
  const { t1, inputStyle } = useApp()
  const { addPaciente } = useMedical()
  const { modalOverlay, modalBox, labelStyle, btnPrimary, btnSecondary } = useMedicalStyles()
  const [form, setForm] = useState<Partial<Paciente>>({})

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 16, color: t1, marginBottom: 20 }}>New Patient</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={labelStyle}>Name *</label><input value={form.nombre || ''} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} style={inputStyle} /></div>
          <div><label style={labelStyle}>Last name *</label><input value={form.apellido || ''} onChange={e => setForm(p => ({ ...p, apellido: e.target.value }))} style={inputStyle} /></div>
          <div><label style={labelStyle}>Date of Birth</label><input type="date" value={form.fecha_nacimiento || ''} onChange={e => setForm(p => ({ ...p, fecha_nacimiento: e.target.value }))} style={inputStyle} /></div>
          <div>
            <label style={labelStyle}>Gender</label>
            <select value={form.genero || ''} onChange={e => setForm(p => ({ ...p, genero: e.target.value }))} style={inputStyle}>
              <option value="">Select...</option>
              {GENEROS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>Phone</label><input value={form.telefono || ''} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} style={inputStyle} /></div>
          <div><label style={labelStyle}>Email</label><input type="email" value={form.email || ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} style={inputStyle} /></div>
          <div>
            <label style={labelStyle}>Insurance</label>
            <select value={form.seguro || ''} onChange={e => setForm(p => ({ ...p, seguro: e.target.value }))} style={inputStyle}>
              <option value="">Select...</option>
              {SEGUROS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>Insurance ID</label><input value={form.seguro_id || ''} onChange={e => setForm(p => ({ ...p, seguro_id: e.target.value }))} style={inputStyle} /></div>
          <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Address</label><input value={form.direccion || ''} onChange={e => setForm(p => ({ ...p, direccion: e.target.value }))} style={inputStyle} /></div>
          <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Allergies</label><input value={form.alergias || ''} onChange={e => setForm(p => ({ ...p, alergias: e.target.value }))} placeholder="Separate with commas..." style={inputStyle} /></div>
          <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Conditions</label><input value={form.condiciones || ''} onChange={e => setForm(p => ({ ...p, condiciones: e.target.value }))} placeholder="Separate with commas..." style={inputStyle} /></div>
          <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Notes</label><textarea value={form.notas || ''} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} /></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={btnSecondary}>Cancel</button>
          <button onClick={() => { if (addPaciente(form)) onClose() }} style={btnPrimary}>Register Patient</button>
        </div>
      </div>
    </div>
  )
}
