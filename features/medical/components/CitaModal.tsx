'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { useMedical } from './MedicalContext'
import { useMedicalStyles } from '../hooks/useMedicalStyles'
import { TIPOS_CITA, DOCTORES, SALAS } from '../constants'
import type { Cita } from '../types'

export default function CitaModal({ onClose }: { onClose: () => void }) {
  const { t1, inputStyle } = useApp()
  const { t } = useT()
  const { addCita, pacientesActivos } = useMedical()
  const { modalOverlay, modalBox, labelStyle, btnPrimary, btnSecondary } = useMedicalStyles()
  const [form, setForm] = useState<Partial<Cita>>({})

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 16, color: t1, marginBottom: 20 }}>{t('med.newAppointment')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>{t('med.patient')} *</label>
            <select value={form.paciente_id || ''} onChange={e => setForm(p => ({ ...p, paciente_id: e.target.value }))} style={inputStyle}>
              <option value="">{t('med.selectPatient')}</option>
              {pacientesActivos.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.apellido} — {p.mrn}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>{t('med.date')} *</label><input type="date" value={form.fecha || ''} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} style={inputStyle} /></div>
          <div><label style={labelStyle}>{t('med.time')} *</label><input type="time" value={form.hora || ''} onChange={e => setForm(p => ({ ...p, hora: e.target.value }))} style={inputStyle} /></div>
          <div>
            <label style={labelStyle}>{t('common.type')}</label>
            <select value={form.tipo || ''} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))} style={inputStyle}>
              <option value="">{t('med.select')}</option>
              {TIPOS_CITA.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>{t('med.doctor')}</label>
            <select value={form.doctor || ''} onChange={e => setForm(p => ({ ...p, doctor: e.target.value }))} style={inputStyle}>
              <option value="">{t('med.select')}</option>
              {DOCTORES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>{t('med.room')}</label>
            <select value={form.sala || ''} onChange={e => setForm(p => ({ ...p, sala: e.target.value }))} style={inputStyle}>
              {SALAS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>{t('med.duration')}</label><input type="number" value={form.duracion || 30} onChange={e => setForm(p => ({ ...p, duracion: parseInt(e.target.value) }))} style={inputStyle} /></div>
          <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>{t('common.notes')}</label><textarea value={form.notas || ''} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} /></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={btnSecondary}>{t('common.cancel')}</button>
          <button onClick={() => { if (addCita(form)) onClose() }} style={btnPrimary}>{t('med.scheduleAppointment')}</button>
        </div>
      </div>
    </div>
  )
}
