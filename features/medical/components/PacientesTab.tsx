'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useT, type I18nKey } from '@/shared/i18n'
import { useMedical } from './MedicalContext'
import { useMedicalStyles } from '../hooks/useMedicalStyles'
import PatientRow from './PatientRow'
import PatientDetail from './PatientDetail'
import type { Paciente } from '../types'

const COLS: (I18nKey | '')[] = ['med.colMrn', 'med.colPatient', 'med.colAge', 'med.colGender', 'med.colInsurance', 'med.colPhone', 'med.colStatus', '']

export default function PacientesTab({ onNewPatient }: { onNewPatient: () => void }) {
  const { t3, border, inputStyle } = useApp()
  const { t } = useT()
  const { searchPaciente, setSearchPaciente, filterEstadoPaciente, setFilterEstadoPaciente, filteredPacientes } = useMedical()
  const { cardStyle, btnPrimary } = useMedicalStyles()
  const [detalle, setDetalle] = useState<Paciente | null>(null)

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <input placeholder={t('med.searchPatient')} value={searchPaciente} onChange={e => setSearchPaciente(e.target.value)} style={{ ...inputStyle, maxWidth: 300 }} />
        <select value={filterEstadoPaciente} onChange={e => setFilterEstadoPaciente(e.target.value)} style={{ ...inputStyle, maxWidth: 160 }}>
          <option value="todos">{t('med.statusAll')}</option>
          <option value="activo">{t('med.statusActive')}</option>
          <option value="inactivo">{t('med.statusInactive')}</option>
          <option value="alta">{t('med.statusDischarged')}</option>
        </select>
        <div style={{ flex: 1 }} />
        <button onClick={onNewPatient} style={btnPrimary}>{t('med.newPatientBtn')}</button>
      </div>

      {detalle ? (
        <PatientDetail paciente={detalle} onBack={() => setDetalle(null)} />
      ) : (
        <div style={cardStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${border}` }}>
                {COLS.map((h, i) => (
                  <th key={i} style={{ textAlign: 'left', padding: '10px 10px', color: t3, fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>{h ? t(h) : ''}</th>
                ))}
              </tr>
            </thead>
            <tbody>{filteredPacientes.map(p => <PatientRow key={p.id} paciente={p} onSelect={setDetalle} />)}</tbody>
          </table>
          {filteredPacientes.length === 0 && (
            <div style={{ textAlign: 'center', padding: 32, color: t3, fontSize: 12 }}>{t('med.noPatients')}</div>
          )}
        </div>
      )}
    </div>
  )
}
