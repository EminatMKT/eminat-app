'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { useMedical } from './MedicalContext'
import { useMedicalStyles } from '../hooks/useMedicalStyles'
import PatientRow from './PatientRow'
import PatientDetail from './PatientDetail'
import type { Paciente } from '../types'

export default function PacientesTab({ onNewPatient }: { onNewPatient: () => void }) {
  const { t3, border, inputStyle } = useApp()
  const { searchPaciente, setSearchPaciente, filterEstadoPaciente, setFilterEstadoPaciente, filteredPacientes } = useMedical()
  const { cardStyle, btnPrimary } = useMedicalStyles()
  const [detalle, setDetalle] = useState<Paciente | null>(null)

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <input placeholder="Search patient (name, MRN)..." value={searchPaciente} onChange={e => setSearchPaciente(e.target.value)} style={{ ...inputStyle, maxWidth: 300 }} />
        <select value={filterEstadoPaciente} onChange={e => setFilterEstadoPaciente(e.target.value)} style={{ ...inputStyle, maxWidth: 160 }}>
          <option value="todos">All statuses</option>
          <option value="activo">Active</option>
          <option value="inactivo">Inactive</option>
          <option value="alta">Discharged</option>
        </select>
        <div style={{ flex: 1 }} />
        <button onClick={onNewPatient} style={btnPrimary}>+ New Patient</button>
      </div>

      {detalle ? (
        <PatientDetail paciente={detalle} onBack={() => setDetalle(null)} />
      ) : (
        <div style={cardStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${border}` }}>
                {['MRN', 'Patient', 'Age', 'Gender', 'Insurance', 'Phone', 'Status', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 10px', color: t3, fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>{filteredPacientes.map(p => <PatientRow key={p.id} paciente={p} onSelect={setDetalle} />)}</tbody>
          </table>
          {filteredPacientes.length === 0 && (
            <div style={{ textAlign: 'center', padding: 32, color: t3, fontSize: 12 }}>No patients found</div>
          )}
        </div>
      )}
    </div>
  )
}
