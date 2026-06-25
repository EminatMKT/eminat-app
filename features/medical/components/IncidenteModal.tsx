'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { useMedical } from './MedicalContext'
import { useMedicalStyles } from '../hooks/useMedicalStyles'
import type { HipaaIncidente } from '../types'

export default function IncidenteModal({ onClose }: { onClose: () => void }) {
  const { t1, inputStyle } = useApp()
  const { t } = useT()
  const { addIncidente, hoy } = useMedical()
  const { modalOverlay, modalBox, labelStyle, btnPrimary, btnSecondary } = useMedicalStyles()
  const [form, setForm] = useState<Partial<HipaaIncidente>>({})

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 16, color: t1, marginBottom: 4 }}>{t('med.reportIncident')}</div>
        <div style={{ fontSize: 11, color: '#F87171', marginBottom: 20 }}>🛡️ {t('med.incidentsAudited')}</div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div><label style={labelStyle}>{t('med.incidentTitle')} *</label><input value={form.titulo || ''} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} style={inputStyle} /></div>
          <div><label style={labelStyle}>{t('common.description')}</label><textarea value={form.descripcion || ''} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>{t('common.type')}</label>
              <select value={form.tipo || 'near_miss'} onChange={e => setForm(p => ({ ...p, tipo: e.target.value as HipaaIncidente['tipo'] }))} style={inputStyle}>
                <option value="near_miss">{t('med.typeNearMiss')}</option>
                <option value="violation">{t('med.typeViolation')}</option>
                <option value="breach">{t('med.typeBreach')}</option>
                <option value="complaint">{t('med.typeComplaint')}</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>{t('med.severity')}</label>
              <select value={form.severidad || 'media'} onChange={e => setForm(p => ({ ...p, severidad: e.target.value as HipaaIncidente['severidad'] }))} style={inputStyle}>
                <option value="baja">{t('med.sevLow')}</option>
                <option value="media">{t('med.sevMedium')}</option>
                <option value="alta">{t('med.sevHigh')}</option>
                <option value="critica">{t('med.sevCritical')}</option>
              </select>
            </div>
            <div><label style={labelStyle}>{t('med.incidentDate')}</label><input type="date" value={form.fecha_incidente || hoy} onChange={e => setForm(p => ({ ...p, fecha_incidente: e.target.value }))} style={inputStyle} /></div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={btnSecondary}>{t('common.cancel')}</button>
          <button onClick={() => { if (addIncidente(form)) onClose() }} style={{ ...btnPrimary, background: '#F87171' }}>{t('med.reportIncidentBtn')}</button>
        </div>
      </div>
    </div>
  )
}
