'use client'
import { useApp } from '@/shared/context/AppContext'
import { useMedical } from './MedicalContext'
import { useMedicalStyles } from '../hooks/useMedicalStyles'
import Badge from './Badge'
import PatientApptRow from './PatientApptRow'
import { calcAge } from '../dates'
import type { Paciente } from '../types'

export default function PatientDetail({ paciente, onBack }: { paciente: Paciente; onBack: () => void }) {
  const { s2, t1, t2, t3, border } = useApp()
  const { citas } = useMedical()
  const { cardStyle, btnSecondary } = useMedicalStyles()
  const apptHistory = citas.filter(c => c.paciente_id === paciente.id)
  return (
    <div>
      <button onClick={onBack} style={{ ...btnSecondary, marginBottom: 16 }}>← Back to list</button>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Demographics */}
        <div style={cardStyle}>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: t1, marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Patient Details
            <Badge color={paciente.estado === 'activo' ? '#34D399' : paciente.estado === 'alta' ? '#FBB040' : '#F87171'}>{paciente.estado}</Badge>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
            {([
              ['MRN', paciente.mrn],
              ['Name', `${paciente.nombre} ${paciente.apellido}`],
              ['DOB', `${paciente.fecha_nacimiento} (${calcAge(paciente.fecha_nacimiento)} years)`],
              ['Gender', paciente.genero],
              ['Phone', paciente.telefono],
              ['Email', paciente.email],
              ['Insurance', `${paciente.seguro} — ${paciente.seguro_id}`],
              ['Address', paciente.direccion],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: 10, color: t3, marginBottom: 2 }}>{label}</div>
                <div style={{ color: t1, fontWeight: 500 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Clinical Info */}
        <div style={cardStyle}>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: t1, marginBottom: 14 }}>Clinical Info</div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: t3, marginBottom: 4 }}>Allergies</div>
            {paciente.alergias && paciente.alergias !== 'Ninguna' ? (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {paciente.alergias.split(',').map(a => <Badge key={a.trim()} color="#F87171">{a.trim()}</Badge>)}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#34D399' }}>No known allergies</div>
            )}
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: t3, marginBottom: 4 }}>Conditions</div>
            {paciente.condiciones && paciente.condiciones !== 'Ninguna' ? (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {paciente.condiciones.split(',').map(c => <Badge key={c.trim()} color="#FBB040">{c.trim()}</Badge>)}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#34D399' }}>No conditions on record</div>
            )}
          </div>
          {paciente.notas && (
            <div>
              <div style={{ fontSize: 10, color: t3, marginBottom: 4 }}>Notes</div>
              <div style={{ fontSize: 12, color: t2, padding: '8px 10px', borderRadius: 8, background: s2 }}>{paciente.notas}</div>
            </div>
          )}
        </div>

        {/* Appointment History */}
        <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: t1, marginBottom: 14 }}>Appointment History</div>
          {apptHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: t3, fontSize: 12 }}>No appointments on record</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${border}` }}>
                  {['Date', 'Time', 'Type', 'Doctor', 'Room', 'Status'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: t3, fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>{apptHistory.map(c => <PatientApptRow key={c.id} cita={c} />)}</tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
